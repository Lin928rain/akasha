const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const { State } = require("fsrs.js");

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", async (req, res, next) => {
  if (req.path === "/health") {
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
  const tasks = [
    supabase.from("cards").delete().eq("user_id", req.userId).neq("id", ""),
    supabase.from("notes").delete().eq("user_id", req.userId).neq("id", ""),
    supabase.from("decks").delete().eq("user_id", req.userId).neq("id", ""),
    supabase
      .from("statistics")
      .delete()
      .eq("user_id", req.userId)
      .neq("deck", ""),
    supabase.from("settings").delete().eq("user_id", req.userId).neq("key", ""),
    supabase
      .from("daily_new_cards")
      .delete()
      .eq("user_id", req.userId)
      .not("day", "is", null),
  ];
  const results = await Promise.all(tasks);
  const error = results.find((result) => result.error);
  if (error && error.error) {
    return sendError(res, error.error, 500);
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
  let deckIds = null;
  if (deckId) {
    const map = await getDeckSubDeckMap(req.userId);
    deckIds = collectDeckIdsFromMap(deckId, map);
  }

  const nowIso = new Date().toISOString();
  const stateColumn = "model->>state";
  const dueColumn = "model->>due";

  const [total, newCount, learningCount, reviewCount] = await Promise.all([
    countCards(req.userId, deckIds, []),
    countCards(req.userId, deckIds, [
      { column: stateColumn, op: "eq", value: String(State.New) },
    ]),
    countCards(req.userId, deckIds, [
      {
        column: stateColumn,
        op: "in",
        value: [String(State.Learning), String(State.Relearning)],
      },
    ]),
    countCards(req.userId, deckIds, [
      { column: stateColumn, op: "eq", value: String(State.Review) },
      { column: dueColumn, op: "lte", value: nowIso },
    ]),
  ]);

  const notDue = Math.max(0, total - newCount - learningCount - reviewCount);

  return res.json({
    state: {
      new: newCount,
      learning: learningCount,
      review: reviewCount,
      notDue,
    },
  });
});

app.post("/api/statistics/deck-card-counts", async (req, res) => {
  const deckIds = req.body?.deckIds || [];
  if (deckIds.length === 0) {
    return res.json({ rows: [] });
  }
  const map = await getDeckSubDeckMap(req.userId);
  const nowIso = new Date().toISOString();
  const stateColumn = "model->>state";
  const dueColumn = "model->>due";

  const results = [];
  for (let index = 0; index < deckIds.length; index += 1) {
    const deckId = deckIds[index];
    const subtree = collectDeckIdsFromMap(deckId, map);
    const [newCount, learningCount, reviewCount] = await Promise.all([
      countCards(req.userId, subtree, [
        { column: stateColumn, op: "eq", value: String(State.New) },
      ]),
      countCards(req.userId, subtree, [
        {
          column: stateColumn,
          op: "in",
          value: [String(State.Learning), String(State.Relearning)],
        },
      ]),
      countCards(req.userId, subtree, [
        { column: stateColumn, op: "eq", value: String(State.Review) },
        { column: dueColumn, op: "lte", value: nowIso },
      ]),
    ]);
    results.push({
      deckId,
      counts: {
        new: newCount,
        learning: learningCount,
        review: reviewCount,
      },
    });
  }

  return res.json({ rows: results });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Akasha API listening on port ${port}`);
});
