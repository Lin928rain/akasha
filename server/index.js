const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const { State } = require("fsrs.js");
const { randomUUID } = require("node:crypto");

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ttsBaseUrl = (process.env.TTS_BASE_URL || "").trim().replace(/\/$/, "");
const aiApiBaseUrl = (process.env.AI_API_BASE_URL || "").trim().replace(/\/$/, "");
const aiModelId = process.env.AI_MODEL_ID || "";
const aiApiKey = process.env.AI_API_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const TABLES = {
  decks: { primaryKey: "id", orderColumns: ["id"] },
  cards: { primaryKey: "id", orderColumns: ["id"] },
  notes: { primaryKey: "id", orderColumns: ["id"] },
  statistics: { primaryKey: ["deck", "day"], orderColumns: ["deck", "day"] },
  settings: { primaryKey: "key", orderColumns: ["key"] },
  daily_new_cards: { primaryKey: "day", orderColumns: ["day"] },
};

const DECK_SUMMARY_COLUMNS =
  "id,name,sub_decks,super_decks,description,options";

function getTableConfig(table) {
  const config = TABLES[table];
  if (!config) {
    return null;
  }
  return config;
}

function sendError(res, error, status) {
  const payload = {
    error: error?.message || String(error),
  };
  return res.status(status || 500).json(payload);
}

function getTtsBaseUrlOrThrow() {
  if (!ttsBaseUrl) {
    throw new Error("Missing TTS_BASE_URL environment variable.");
  }
  return ttsBaseUrl;
}

function normalizeJsonArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function getDeckSubDeckMap(userId) {
  const { data, error } = await supabase
    .from("decks")
    .select("id,sub_decks")
    .eq("user_id", userId);
  if (error) {
    throw error;
  }
  const map = {};
  (data || []).forEach((row) => {
    map[row.id] = normalizeJsonArray(row.sub_decks);
  });
  return map;
}

function collectDeckIdsFromMap(rootId, map) {
  const collected = [];
  const seen = {};
  const stack = [rootId];
  while (stack.length > 0) {
    const deckId = stack.pop();
    if (!deckId || seen[deckId]) {
      continue;
    }
    seen[deckId] = true;
    collected.push(deckId);
    const children = map[deckId] || [];
    for (let index = 0; index < children.length; index += 1) {
      const childId = children[index];
      if (!seen[childId]) {
        stack.push(childId);
      }
    }
  }
  return collected;
}

async function applyWhere(baseQuery, where) {
  let query = baseQuery;
  if (!where || !where.columns || !where.values) {
    return query;
  }
  for (let index = 0; index < where.columns.length; index += 1) {
    query = query.eq(where.columns[index], where.values[index]);
  }
  return query;
}

function applyUserScope(baseQuery, userId) {
  return baseQuery.eq("user_id", userId);
}

function applyFilters(baseQuery, filters) {
  let query = baseQuery;
  const list = filters || [];
  for (let index = 0; index < list.length; index += 1) {
    const filter = list[index];
    if (filter.op === "eq") {
      query = query.eq(filter.column, filter.value);
    } else if (filter.op === "lt") {
      query = query.lt(filter.column, filter.value);
    } else if (filter.op === "lte") {
      query = query.lte(filter.column, filter.value);
    } else if (filter.op === "gt") {
      query = query.gt(filter.column, filter.value);
    } else if (filter.op === "gte") {
      query = query.gte(filter.column, filter.value);
    } else if (filter.op === "in") {
      query = query.in(filter.column, filter.value || []);
    } else if (filter.op === "is") {
      query = query.is(filter.column, filter.value);
    }
  }
  return query;
}

async function countCards(userId, deckIds, extraFilters) {
  let query = supabase
    .from("cards")
    .select("id", { count: "exact", head: true });
  query = applyUserScope(query, userId);
  if (deckIds && deckIds.length > 0) {
    query = query.in("deck", deckIds);
  }
  query = applyFilters(query, extraFilters);
  const { count, error } = await query;
  if (error) {
    throw error;
  }
  return count || 0;
}

const IMPORT_JOB_TTL_MS = 60 * 60 * 1000;
const IMPORT_CHUNK_SIZE = 500;
const importJobs = new Map();
const statsCache = new Map();
const STATS_CACHE_TTL_MS = 3000;

function cleanupImportJobs() {
  const now = Date.now();
  for (const [jobId, job] of importJobs.entries()) {
    if (now - job.updatedAtMs > IMPORT_JOB_TTL_MS) {
      importJobs.delete(jobId);
    }
  }
}

function getStatsCacheKey(userId, name, args) {
  return `${userId}:${name}:${JSON.stringify(args || {})}`;
}

function getStatsCache(userId, name, args) {
  const key = getStatsCacheKey(userId, name, args);
  const item = statsCache.get(key);
  if (!item) {
    return null;
  }
  if (Date.now() - item.at > STATS_CACHE_TTL_MS) {
    statsCache.delete(key);
    return null;
  }
  return item.value;
}

function setStatsCache(userId, name, args, value) {
  const key = getStatsCacheKey(userId, name, args);
  statsCache.set(key, { value, at: Date.now() });
}

function createImportJob(userId) {
  const id = randomUUID();
  const now = Date.now();
  const job = {
    id,
    userId,
    status: "queued",
    stage: "queued",
    totalItems: 0,
    processedItems: 0,
    message: "",
    error: "",
    createdAtMs: now,
    updatedAtMs: now,
  };
  importJobs.set(id, job);
  return job;
}

function updateImportJob(jobId, patch) {
  const job = importJobs.get(jobId);
  if (!job) {
    return null;
  }
  Object.assign(job, patch, { updatedAtMs: Date.now() });
  return job;
}

function getImportJob(jobId) {
  return importJobs.get(jobId) || null;
}

function parseImportPayload(text) {
  const parsed = JSON.parse(text || "{}");
  const pickArray = (...keys) => {
    for (let index = 0; index < keys.length; index += 1) {
      const value = parsed[keys[index]];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return [];
  };
  return {
    decks: pickArray("decks"),
    cards: pickArray("cards"),
    notes: pickArray("notes"),
    statistics: pickArray("statistics"),
    settings: pickArray("settings"),
    dailyNewCards: pickArray("dailyNewCards", "daily_new_cards"),
  };
}

function createImportId() {
  return randomUUID();
}

function remapImportedIds(payload) {
  const deckIdMap = {};
  const noteIdMap = {};
  const cardIdMap = {};

  (payload.decks || []).forEach((deck) => {
    if (deck?.id && !deckIdMap[deck.id]) {
      deckIdMap[deck.id] = createImportId();
    }
  });
  (payload.notes || []).forEach((note) => {
    if (note?.id && !noteIdMap[note.id]) {
      noteIdMap[note.id] = createImportId();
    }
  });
  (payload.cards || []).forEach((card) => {
    if (card?.id && !cardIdMap[card.id]) {
      cardIdMap[card.id] = createImportId();
    }
  });

  const decks = (payload.decks || []).map((deck) => ({
    ...deck,
    id: deckIdMap[deck.id] || createImportId(),
    subDecks: (deck.subDecks || []).map((id) => deckIdMap[id] || id),
    superDecks: (deck.superDecks || []).map((id) => deckIdMap[id] || id),
    cards: (deck.cards || []).map((id) => cardIdMap[id] || id),
    notes: (deck.notes || []).map((id) => noteIdMap[id] || id),
  }));

  const notes = (payload.notes || []).map((note) => ({
    ...note,
    id: noteIdMap[note.id] || createImportId(),
    deck: deckIdMap[note.deck] || note.deck,
  }));

  const cards = (payload.cards || []).map((card) => ({
    ...card,
    id: cardIdMap[card.id] || createImportId(),
    note: noteIdMap[card.note] || card.note,
    deck: deckIdMap[card.deck] || card.deck,
  }));

  const statistics = (payload.statistics || []).map((row) => ({
    ...row,
    deck: deckIdMap[row.deck] || row.deck,
  }));

  return {
    decks,
    notes,
    cards,
    statistics,
    settings: payload.settings || [],
    dailyNewCards: payload.dailyNewCards || [],
  };
}

async function clearUserData(userId) {
  const tasks = [
    supabase.from("cards").delete().eq("user_id", userId).neq("id", ""),
    supabase.from("notes").delete().eq("user_id", userId).neq("id", ""),
    supabase.from("decks").delete().eq("user_id", userId).neq("id", ""),
    supabase.from("statistics").delete().eq("user_id", userId).neq("deck", ""),
    supabase.from("settings").delete().eq("user_id", userId).neq("key", ""),
    supabase
      .from("daily_new_cards")
      .delete()
      .eq("user_id", userId)
      .not("day", "is", null),
    supabase.from("deck_card_counts").delete().eq("user_id", userId),
  ];
  const results = await Promise.all(tasks);
  const error = results.find((result) => result.error);
  if (error && error.error) {
    throw error.error;
  }
}

function toDbRows(remapped, userId) {
  return {
    decks: (remapped.decks || []).map((deck) => ({
      id: deck.id,
      user_id: userId,
      name: deck.name,
      sub_decks: deck.subDecks || [],
      super_decks: deck.superDecks || [],
      cards: deck.cards || [],
      notes: deck.notes || [],
      description: deck.description || null,
      options: deck.options || {},
    })),
    notes: (remapped.notes || []).map((note) => ({
      id: note.id,
      user_id: userId,
      deck: note.deck,
      creation_date: note.creationDate || new Date().toISOString(),
      custom_order: note.customOrder ?? null,
      content: note.content || {},
      sort_field: note.sortField || "",
    })),
    cards: (remapped.cards || []).map((card) => ({
      id: card.id,
      user_id: userId,
      note: card.note,
      deck: card.deck,
      creation_date: card.creationDate || new Date().toISOString(),
      custom_order: card.customOrder ?? null,
      history: card.history || [],
      model: card.model || {},
      content: card.content || {},
    })),
    statistics: (remapped.statistics || []).map((row) => ({
      user_id: userId,
      deck: row.deck,
      day: row.day,
      time: row.time || {},
      cards: row.cards || {},
      ratings_list: row.ratingsList || {},
    })),
    settings: (remapped.settings || []).map((setting) => ({
      user_id: userId,
      key: setting.key,
      value: setting.value,
    })),
    daily_new_cards: (remapped.dailyNewCards || []).map((row) => ({
      user_id: userId,
      day: row.day,
      count: row.count,
    })),
  };
}

async function upsertRowsInChunks(table, rows, onConflict, onProgress) {
  if (!rows || rows.length === 0) {
    return;
  }
  for (let index = 0; index < rows.length; index += IMPORT_CHUNK_SIZE) {
    const chunk = rows.slice(index, index + IMPORT_CHUNK_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict, ignoreDuplicates: false });
    if (error) {
      throw error;
    }
    onProgress(chunk.length);
  }
}

async function runImportJob(jobId, userId, text) {
  try {
    updateImportJob(jobId, {
      status: "running",
      stage: "parsing",
      message: "Parsing import file...",
    });

    const payload = parseImportPayload(text);
    const remapped = remapImportedIds(payload);
    const rows = toDbRows(remapped, userId);
    const totalItems =
      rows.decks.length +
      rows.notes.length +
      rows.cards.length +
      rows.statistics.length +
      rows.settings.length +
      rows.daily_new_cards.length;

    let processedItems = 0;
    const stepProgress = (count) => {
      processedItems += count;
      updateImportJob(jobId, {
        processedItems,
        totalItems,
      });
    };

    updateImportJob(jobId, {
      stage: "clearing",
      message: "Clearing existing data...",
      totalItems,
      processedItems: 0,
    });

    await clearUserData(userId);

    updateImportJob(jobId, {
      stage: "importing",
      message: "Importing decks...",
    });
    await upsertRowsInChunks("decks", rows.decks, "id", stepProgress);

    updateImportJob(jobId, {
      stage: "importing",
      message: "Importing notes...",
    });
    await upsertRowsInChunks("notes", rows.notes, "id", stepProgress);

    updateImportJob(jobId, {
      stage: "importing",
      message: "Importing cards...",
    });
    await upsertRowsInChunks("cards", rows.cards, "id", stepProgress);

    updateImportJob(jobId, {
      stage: "importing",
      message: "Importing statistics...",
    });
    await upsertRowsInChunks(
      "statistics",
      rows.statistics,
      "user_id,deck,day",
      stepProgress
    );

    updateImportJob(jobId, {
      stage: "importing",
      message: "Importing settings...",
    });
    await upsertRowsInChunks(
      "settings",
      rows.settings,
      "user_id,key",
      stepProgress
    );

    updateImportJob(jobId, {
      stage: "importing",
      message: "Importing daily new cards...",
    });
    await upsertRowsInChunks(
      "daily_new_cards",
      rows.daily_new_cards,
      "user_id,day",
      stepProgress
    );

    // 导入完成后，刷新统计数据（触发器在批量插入时可能不会正确累加）
    updateImportJob(jobId, {
      stage: "finalizing",
      message: "Refreshing card statistics...",
    });
    await supabase.rpc("refresh_deck_card_counts");

    updateImportJob(jobId, {
      status: "completed",
      stage: "completed",
      message: "Import completed.",
      processedItems: totalItems,
      totalItems,
    });
  } catch (error) {
    updateImportJob(jobId, {
      status: "failed",
      stage: "failed",
      error: error?.message || String(error),
      message: "Import failed.",
    });
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

function normalizeAuthPayload(payload) {
  const session = payload?.session || null;
  const user = payload?.user || session?.user || null;
  if (!session?.access_token || !user?.id) {
    return null;
  }
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    expiresAt:
      typeof session.expires_at === "number" ? session.expires_at : null,
    user: {
      id: user.id,
      email: user.email || null,
    },
  };
}

app.post("/api/auth/signin", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return sendError(res, "Email and password are required.", 400);
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return sendError(res, error, 401);
  }
  const normalized = normalizeAuthPayload(data);
  if (!normalized) {
    return sendError(res, "Invalid authentication response.", 500);
  }
  return res.json({ session: normalized });
});

app.post("/api/auth/signup", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return sendError(res, "Email and password are required.", 400);
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    return sendError(res, createError, 400);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return sendError(res, error, 401);
  }
  const normalized = normalizeAuthPayload(data);
  if (!normalized) {
    return sendError(res, "Invalid authentication response.", 500);
  }
  return res.status(201).json({ session: normalized });
});

app.get("/api/auth/session", async (req, res) => {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return sendError(res, "Missing bearer token.", 401);
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return sendError(res, "Missing bearer token.", 401);
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return sendError(res, "Invalid authentication token.", 401);
  }

  return res.json({
    session: {
      accessToken: token,
      refreshToken: null,
      expiresAt: null,
      user: {
        id: data.user.id,
        email: data.user.email || null,
      },
    },
  });
});

app.post("/api/auth/refresh", async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || "").trim();
  if (!refreshToken) {
    return sendError(res, "Refresh token is required.", 400);
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error) {
    return sendError(res, error, 401);
  }

  const normalized = normalizeAuthPayload(data);
  if (!normalized) {
    return sendError(res, "Invalid refresh response.", 500);
  }
  return res.json({ session: normalized });
});

app.post("/api/auth/signout", (_req, res) => {
  return res.json({ ok: true });
});

app.post("/api/auth/change-password", async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    return sendError(
      res,
      "Current password and new password are required.",
      400
    );
  }

  if (newPassword.length < 6) {
    return sendError(res, "New password must be at least 6 characters.", 400);
  }

  // 从请求头获取 token，得到用户 email
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return sendError(res, "Missing bearer token.", 401);
  }
  const token = authorization.slice("Bearer ".length).trim();
  const { data: userData, error: userError } =
    await supabase.auth.getUser(token);
  if (userError || !userData?.user?.email) {
    return sendError(res, "Unable to get user information.", 401);
  }

  const userEmail = userData.user.email;

  // 验证当前密码是否正确（通过尝试登录）
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: currentPassword,
  });
  if (signInError) {
    return sendError(res, "Current password is incorrect.", 401);
  }

  // 使用 admin API 更新密码（service role key 可以直接更新）
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userData.user.id,
    { password: newPassword }
  );
  if (updateError) {
    return sendError(res, updateError, 500);
  }

  return res.json({ ok: true });
});

app.use("/api", async (req, res, next) => {
  // 这些路由不需要 token 验证
  const publicPaths = [
    "/health",
    "/auth/signin",
    "/auth/signup",
    "/auth/refresh",
  ];
  if (publicPaths.some((path) => req.path.startsWith(path))) {
    return next();
  }
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return sendError(res, "Missing bearer token.", 401);
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    return sendError(res, "Missing bearer token.", 401);
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return sendError(res, "Invalid authentication token.", 401);
  }
  req.userId = data.user.id;
  return next();
});

app.get("/api/tts/voices", async (req, res) => {
  try {
    const baseUrl = getTtsBaseUrlOrThrow();
    const upstream = new URL(`${baseUrl}/voices`);
    const localePrefix = String(req.query.locale_prefix || "").trim();
    if (localePrefix) {
      upstream.searchParams.set("locale_prefix", localePrefix);
    }
    const response = await fetch(upstream.toString());
    const text = await response.text();
    res.status(response.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (error) {
    return sendError(res, error, 500);
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const baseUrl = getTtsBaseUrlOrThrow();
    const response = await fetch(`${baseUrl}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body || {}),
    });

    if (!response.ok) {
      const text = await response.text();
      return sendError(
        res,
        text || `TTS request failed: ${response.status}`,
        response.status
      );
    }

    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const arrayBuffer = await response.arrayBuffer();
    res.status(200);
    res.setHeader("Content-Type", contentType);
    return res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// 批量 TTS 请求接口
app.post("/api/tts/batch", async (req, res) => {
  try {
    const baseUrl = getTtsBaseUrlOrThrow();
    const items = req.body?.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, "Invalid or empty items array.", 400);
    }

    // 限制批量大小，避免请求过大
    const MAX_BATCH_SIZE = 100;
    if (items.length > MAX_BATCH_SIZE) {
      return sendError(
        res,
        `Batch size exceeds limit of ${MAX_BATCH_SIZE}.`,
        400
      );
    }

    const results = [];

    // 并发请求，但限制并发数量
    const CONCURRENCY_LIMIT = 5;
    for (let i = 0; i < items.length; i += CONCURRENCY_LIMIT) {
      const batch = items.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const response = await fetch(`${baseUrl}/tts`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: item.text,
                voice: item.voice,
                rate: item.rate,
                stream: false, // 批量请求时不使用流式
              }),
            });

            if (!response.ok) {
              const text = await response.text();
              return {
                text: item.text,
                voice: item.voice,
                rate: item.rate,
                audioBase64: "",
                contentType: "audio/mpeg",
                error: text || `TTS failed: ${response.status}`,
              };
            }

            const contentType =
              response.headers.get("content-type") || "audio/mpeg";
            const arrayBuffer = await response.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");

            return {
              text: item.text,
              voice: item.voice,
              rate: item.rate,
              audioBase64: base64,
              contentType,
            };
          } catch (error) {
            return {
              text: item.text,
              voice: item.voice,
              rate: item.rate,
              audioBase64: "",
              contentType: "audio/mpeg",
              error: error?.message || String(error),
            };
          }
        })
      );
      results.push(...batchResults);
    }

    return res.json({ results });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// AI 造句代理端点
app.post("/api/ai/generate-sentence", async (req, res) => {
  try {
    // 检查后端是否配置了 AI API
    if (!aiApiBaseUrl || !aiModelId || !aiApiKey) {
      return sendError(
        res,
        "AI API not configured on server. Please set AI_API_BASE_URL, AI_MODEL_ID, and AI_API_KEY environment variables.",
        503
      );
    }

    const { word, language = "zh" } = req.body || {};
    if (!word) {
      return sendError(res, "Word is required.", 400);
    }

    // 构建 prompt
    const isChinese = language.startsWith("zh");
    const systemPrompt = isChinese
      ? '你是一个语言学习助手。请根据提供的词语，造一个简单、实用的句子。返回格式为 JSON：{"sentence": "造句内容", "translation": "英文翻译（如果是中文造句）"}。只返回 JSON，不要其他内容。'
      : 'You are a language learning assistant. Please create a simple, practical sentence using the provided word. Return in JSON format: {"sentence": "the sentence", "translation": "translation to Chinese"}. Only return JSON, nothing else.';

    const userPrompt = isChinese
      ? `请用以下词语造句：${word}`
      : `Please create a sentence using the following word: ${word}`;

    // 调用 AI API（OpenAI 格式）
    const apiUrl = aiApiBaseUrl.replace(/\/$/, "");
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiApiKey}`,
      },
      body: JSON.stringify({
        model: aiModelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return sendError(
        res,
        text || `AI API request failed: ${response.status}`,
        response.status
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return sendError(res, "No content generated.", 500);
    }

    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(content);
      return res.json({
        sentence: parsed.sentence || content,
        translation: parsed.translation,
      });
    } catch {
      // 如果不是 JSON 格式，返回原始内容
      return res.json({ sentence: content });
    }
  } catch (error) {
    return sendError(res, error, 500);
  }
});

app.post(
  "/api/import/jobs",
  express.text({ type: "*/*", limit: "200mb" }),
  async (req, res) => {
    cleanupImportJobs();
    const text = typeof req.body === "string" ? req.body : "";
    if (!text.trim()) {
      return sendError(res, "Import file content is empty.", 400);
    }
    const job = createImportJob(req.userId);
    setTimeout(() => {
      runImportJob(job.id, req.userId, text);
    }, 0);
    return res.status(202).json({ jobId: job.id });
  }
);

app.get("/api/import/jobs/:jobId", async (req, res) => {
  cleanupImportJobs();
  const job = getImportJob(req.params.jobId);
  if (!job || job.userId !== req.userId) {
    return sendError(res, "Import job not found.", 404);
  }
  return res.json({
    job: {
      id: job.id,
      status: job.status,
      stage: job.stage,
      message: job.message,
      error: job.error || null,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
    },
  });
});

app.get("/api/tables/:table/all", async (req, res) => {
  const table = getTableConfig(req.params.table);
  if (!table) {
    return sendError(res, "Unknown table.", 400);
  }
  const limit = 1000;
  let allRows = [];
  let offset = 0;
  while (true) {
    let query = supabase
      .from(req.params.table)
      .select("*")
      .range(offset, offset + limit - 1);
    query = applyUserScope(query, req.userId);
    if (table.orderColumns && table.orderColumns.length > 0) {
      table.orderColumns.forEach((column, index) => {
        query = query.order(column, {
          ascending: true,
          nullsFirst: index === 0,
        });
      });
    }
    const { data, error } = await query;
    if (error) {
      return sendError(res, error, 500);
    }
    const rows = data || [];
    allRows = allRows.concat(rows);
    if (rows.length < limit) {
      break;
    }
    offset += limit;
  }
  return res.json({ rows: allRows });
});

app.post("/api/tables/:table/get", async (req, res) => {
  const table = getTableConfig(req.params.table);
  if (!table) {
    return sendError(res, "Unknown table.", 400);
  }
  const where = req.body?.where;
  let query = supabase.from(req.params.table).select("*").limit(1);
  query = applyUserScope(query, req.userId);
  query = await applyWhere(query, where);
  const { data, error } = await query;
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ row: data && data.length > 0 ? data[0] : null });
});

app.post("/api/tables/:table/query", async (req, res) => {
  const table = getTableConfig(req.params.table);
  if (!table) {
    return sendError(res, "Unknown table.", 400);
  }
  const where = req.body?.where;
  let query = supabase.from(req.params.table).select("*");
  query = applyUserScope(query, req.userId);
  query = await applyWhere(query, where);
  const { data, error } = await query;
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ rows: data || [] });
});

app.post("/api/tables/:table/insert", async (req, res) => {
  const table = getTableConfig(req.params.table);
  if (!table) {
    return sendError(res, "Unknown table.", 400);
  }
  const row = {
    ...(req.body?.row || {}),
    user_id: req.userId,
  };
  const { error } = await supabase.from(req.params.table).insert(row);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ ok: true });
});

app.post("/api/tables/:table/upsert", async (req, res) => {
  const table = getTableConfig(req.params.table);
  if (!table) {
    return sendError(res, "Unknown table.", 400);
  }
  const row = {
    ...(req.body?.row || {}),
    user_id: req.userId,
  };
  const { error } = await supabase.from(req.params.table).upsert(row);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ ok: true });
});

app.post("/api/tables/:table/update", async (req, res) => {
  const table = getTableConfig(req.params.table);
  if (!table) {
    return sendError(res, "Unknown table.", 400);
  }
  const where = req.body?.where;
  const changes = req.body?.changes || {};
  let query = supabase.from(req.params.table).update(changes);
  query = applyUserScope(query, req.userId);
  query = await applyWhere(query, where);
  const { error } = await query;
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ ok: true });
});

app.post("/api/tables/:table/delete", async (req, res) => {
  const table = getTableConfig(req.params.table);
  if (!table) {
    return sendError(res, "Unknown table.", 400);
  }
  const where = req.body?.where;
  let query = supabase.from(req.params.table).delete();
  query = applyUserScope(query, req.userId);
  query = await applyWhere(query, where);
  const { error } = await query;
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ ok: true });
});

app.post("/api/tables/:table/bulk-get", async (req, res) => {
  const config = getTableConfig(req.params.table);
  if (!config) {
    return sendError(res, "Unknown table.", 400);
  }
  if (Array.isArray(config.primaryKey)) {
    return sendError(res, "bulk-get not supported for composite keys.", 400);
  }
  const keys = req.body?.keys || [];
  if (keys.length === 0) {
    return res.json({ rows: [] });
  }
  const { data, error } = await supabase
    .from(req.params.table)
    .select("*")
    .eq("user_id", req.userId)
    .in(config.primaryKey, keys);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ rows: data || [] });
});

app.post("/api/tables/:table/bulk-add", async (req, res) => {
  const config = getTableConfig(req.params.table);
  if (!config) {
    return sendError(res, "Unknown table.", 400);
  }
  const rows = (req.body?.rows || []).map((row) => ({
    ...row,
    user_id: req.userId,
  }));
  if (rows.length === 0) {
    return res.json({ ok: true });
  }
  const { error } = await supabase.from(req.params.table).insert(rows);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ ok: true });
});

app.post("/api/tables/:table/bulk-delete", async (req, res) => {
  const config = getTableConfig(req.params.table);
  if (!config) {
    return sendError(res, "Unknown table.", 400);
  }
  if (Array.isArray(config.primaryKey)) {
    return sendError(res, "bulk-delete not supported for composite keys.", 400);
  }
  const keys = req.body?.keys || [];
  if (keys.length === 0) {
    return res.json({ ok: true });
  }
  const { error } = await supabase
    .from(req.params.table)
    .delete()
    .eq("user_id", req.userId)
    .in(config.primaryKey, keys);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ ok: true });
});

app.post("/api/tables/:table/where-in", async (req, res) => {
  const config = getTableConfig(req.params.table);
  if (!config) {
    return sendError(res, "Unknown table.", 400);
  }
  const column = req.body?.column;
  const values = req.body?.values || [];
  if (!column) {
    return sendError(res, "Missing column.", 400);
  }
  if (values.length === 0) {
    return res.json({ rows: [] });
  }
  const { data, error } = await supabase
    .from(req.params.table)
    .select("*")
    .eq("user_id", req.userId)
    .in(column, values);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ rows: data || [] });
});

app.post("/api/tables/:table/count", async (req, res) => {
  const config = getTableConfig(req.params.table);
  if (!config) {
    return sendError(res, "Unknown table.", 400);
  }
  const filters = req.body?.filters || [];
  let query = supabase
    .from(req.params.table)
    .select("id", { count: "exact", head: true });
  query = applyUserScope(query, req.userId);
  query = applyFilters(query, filters);
  const { count, error } = await query;
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ count: count || 0 });
});

app.post("/api/admin/clear", async (req, res) => {
  try {
    await clearUserData(req.userId);
  } catch (error) {
    return sendError(res, error, 500);
  }
  return res.json({ ok: true });
});

app.get("/api/decks/summaries", async (req, res) => {
  const { data, error } = await supabase
    .from("decks")
    .select(DECK_SUMMARY_COLUMNS)
    .eq("user_id", req.userId);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ rows: data || [] });
});

app.get("/api/decks/summaries/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("decks")
    .select(DECK_SUMMARY_COLUMNS)
    .eq("user_id", req.userId)
    .eq("id", req.params.id)
    .limit(1);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ row: data && data.length > 0 ? data[0] : null });
});

app.post("/api/decks/summaries/bulk", async (req, res) => {
  const ids = req.body?.ids || [];
  if (ids.length === 0) {
    return res.json({ rows: [] });
  }
  const { data, error } = await supabase
    .from("decks")
    .select(DECK_SUMMARY_COLUMNS)
    .eq("user_id", req.userId)
    .in("id", ids);
  if (error) {
    return sendError(res, error, 500);
  }
  return res.json({ rows: data || [] });
});

app.post("/api/statistics/review-summary", async (req, res) => {
  const days = Number(req.body?.days || 30);
  const deckId = req.body?.deckId || null;
  const now = new Date();
  const start = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString().split("T")[0];
  const endIso = now.toISOString().split("T")[0];

  let deckIds = null;
  if (deckId) {
    const map = await getDeckSubDeckMap(req.userId);
    deckIds = collectDeckIdsFromMap(deckId, map);
  }

  let query = supabase
    .from("statistics")
    .select("day,cards")
    .eq("user_id", req.userId)
    .gte("day", startIso)
    .lte("day", endIso);
  if (deckIds && deckIds.length > 0) {
    query = query.in("deck", deckIds);
  }

  const { data, error } = await query;
  if (error) {
    return sendError(res, error, 500);
  }

  const byDay = {};
  (data || []).forEach((row) => {
    const day = row.day;
    if (!byDay[day]) {
      byDay[day] = {
        day,
        [State.Review]: 0,
        [State.Learning]: 0,
        [State.New]: 0,
      };
    }
    const cards = row.cards || {};
    byDay[day][State.Review] += cards[State.Review] || 0;
    byDay[day][State.Learning] +=
      (cards[State.Learning] || 0) + (cards[State.Relearning] || 0);
    byDay[day][State.New] += cards[State.New] || 0;
  });

  const result = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const day = date.toISOString().split("T")[0];
    result.push(
      byDay[day] || {
        day,
        [State.Review]: 0,
        [State.Learning]: 0,
        [State.New]: 0,
      }
    );
  }

  return res.json({ rows: result });
});

app.post("/api/statistics/card-state", async (req, res) => {
  const deckId = req.body?.deckId || null;
  const cached = getStatsCache(req.userId, "card-state", { deckId });
  if (cached) {
    return res.json(cached);
  }

  let result;
  if (deckId) {
    // 使用预聚合表快速查询
    const { data, error } = await supabase
      .from("deck_card_counts")
      .select("new_count, learning_count, review_count, not_due_count")
      .eq("user_id", req.userId)
      .eq("deck_id", deckId)
      .single();

    if (error || !data) {
      // 如果没有预聚合数据，返回零值
      result = { new: 0, learning: 0, review: 0, notDue: 0 };
    } else {
      result = {
        new: data.new_count,
        learning: data.learning_count,
        review: data.review_count,
        notDue: data.not_due_count,
      };
    }
  } else {
    // 没有指定 deckId，返回全用户的总和
    const { data, error } = await supabase
      .from("deck_card_counts")
      .select("new_count, learning_count, review_count, not_due_count")
      .eq("user_id", req.userId);

    if (error) {
      result = { new: 0, learning: 0, review: 0, notDue: 0 };
    } else {
      result = {
        new: data.reduce((sum, row) => sum + row.new_count, 0),
        learning: data.reduce((sum, row) => sum + row.learning_count, 0),
        review: data.reduce((sum, row) => sum + row.review_count, 0),
        notDue: data.reduce((sum, row) => sum + row.not_due_count, 0),
      };
    }
  }

  const payload = { state: result };
  setStatsCache(req.userId, "card-state", { deckId }, payload);
  return res.json(payload);
});

app.post("/api/statistics/deck-card-counts", async (req, res) => {
  const deckIds = req.body?.deckIds || [];
  const cached = getStatsCache(req.userId, "deck-card-counts", { deckIds });
  if (cached) {
    return res.json(cached);
  }
  if (deckIds.length === 0) {
    return res.json({ rows: [] });
  }

  // 获取所有卡组的子卡组映射
  const map = await getDeckSubDeckMap(req.userId);

  // 批量查询所有需要用到的 deck_id 的统计数据
  const allDeckIds = new Set();
  const deckToSubtree = {};

  for (let index = 0; index < deckIds.length; index += 1) {
    const deckId = deckIds[index];
    const subtree = collectDeckIdsFromMap(deckId, map);
    deckToSubtree[deckId] = subtree;
    subtree.forEach((id) => allDeckIds.add(id));
  }

  // 一次性查询所有 deck 的统计数据
  const { data, error } = await supabase
    .from("deck_card_counts")
    .select("deck_id, new_count, learning_count, review_count, not_due_count")
    .eq("user_id", req.userId)
    .in("deck_id", Array.from(allDeckIds));

  if (error) {
    return res.json({ rows: [] });
  }

  // 构建 deck_id -> counts 的映射
  const countsMap = {};
  (data || []).forEach((row) => {
    countsMap[row.deck_id] = {
      new: row.new_count,
      learning: row.learning_count,
      review: row.review_count,
    };
  });

  // 为每个请求的 deckId 聚合其子卡组的统计数据
  const results = [];
  for (let index = 0; index < deckIds.length; index += 1) {
    const deckId = deckIds[index];
    const subtree = deckToSubtree[deckId];
    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;

    subtree.forEach((subDeckId) => {
      const counts = countsMap[subDeckId];
      if (counts) {
        newCount += counts.new;
        learningCount += counts.learning;
        reviewCount += counts.review;
      }
    });

    results.push({
      deckId,
      counts: {
        new: newCount,
        learning: learningCount,
        review: reviewCount,
      },
    });
  }

  const payload = { rows: results };
  setStatsCache(req.userId, "deck-card-counts", { deckIds }, payload);
  return res.json(payload);
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Akasha API listening on port ${port}`);
});
