import { apiRequest } from "./api";
import { getCurrentUserId } from "./auth";
import { Card } from "./card/card";
import { Deck, DeckSummary } from "./deck/deck";
import { Note, NoteType } from "./note/note";
import { Settings, SettingsValues } from "./settings/Settings";
import { getLocalSetting } from "./settings/localSettings";
import { DeckStatistics } from "./statistics";
import { ConcurrentRequestQueue } from "./utils/ConcurrentRequestQueue";

export interface DailyNewCards {
  day: string;
  count: number;
  userId?: string;
}

type DbRow = Record<string, unknown>;
type PrimaryKey = string | string[];

export type DbTable<T> = ApiTable<T>;

type TableCodec<T> = {
  name: string;
  primaryKey: PrimaryKey;
  toRow: (value: T) => DbRow;
  fromRow: (row: DbRow) => T;
  toPartialRow: (value: Partial<T>) => DbRow;
};

type DbListener = () => void;

const listeners = new Set<DbListener>();
let transactionDepth = 0;
let pendingNotify = false;
let notificationSuppressionDepth = 0;

export function subscribeDbChanges(listener: DbListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyDbChanges(): void {
  listeners.forEach((listener) => listener());
}

function markChanged(): void {
  if (transactionDepth > 0 || notificationSuppressionDepth > 0) {
    pendingNotify = true;
    return;
  }
  notifyDbChanges();
}

export async function runWithoutDbNotifications<T>(
  fn: () => Promise<T> | T
): Promise<T> {
  notificationSuppressionDepth += 1;
  try {
    return await fn();
  } finally {
    notificationSuppressionDepth = Math.max(
      0,
      notificationSuppressionDepth - 1
    );
    if (
      notificationSuppressionDepth === 0 &&
      transactionDepth === 0 &&
      pendingNotify
    ) {
      pendingNotify = false;
      notifyDbChanges();
    }
  }
}

const dateKeys = new Set(["creationDate", "due", "last_review", "review"]);

/**
 * 获取 API 并发请求配置
 * 从 localStorage 读取用户设置
 */
function getApiRequestConfig(): {
  maxConcurrent: number;
  maxRetries: number;
  retryDelayMs: number;
} {
  const maxConcurrent = getLocalSetting("api_maxConcurrentRequests");
  const maxRetries = getLocalSetting("api_requestRetryAttempts");
  const retryDelayMs = getLocalSetting("api_requestRetryDelayMs");

  return {
    maxConcurrent: typeof maxConcurrent === "number" ? maxConcurrent : 10,
    maxRetries: typeof maxRetries === "number" ? maxRetries : 3,
    retryDelayMs: typeof retryDelayMs === "number" ? retryDelayMs : 500,
  };
}

/**
 * 全局并发请求队列实例
 * 懒加载，第一次使用时创建
 */
let globalRequestQueueInstance: ConcurrentRequestQueue | null = null;

function getGlobalRequestQueue(): ConcurrentRequestQueue {
  if (!globalRequestQueueInstance) {
    const config = getApiRequestConfig();
    globalRequestQueueInstance = new ConcurrentRequestQueue(
      config.maxConcurrent,
      {
        maxRetries: config.maxRetries,
        retryDelayMs: config.retryDelayMs,
        exponentialBackoff: true,
      }
    );
  }
  return globalRequestQueueInstance;
}

/**
 * 当设置变化时，更新并发队列的配置
 * 应该在应用启动时调用一次，并在设置变化时调用
 */
export function updateRequestQueueConfig(): void {
  if (globalRequestQueueInstance) {
    const config = getApiRequestConfig();
    globalRequestQueueInstance.setMaxConcurrent(config.maxConcurrent);
  }
}

function dateReplacer(_key: string, val: unknown): unknown {
  if (val instanceof Date) {
    return val.toISOString();
  }
  return val;
}

function dateReviver(key: string, val: unknown): unknown {
  if (typeof val === "string" && dateKeys.has(key)) {
    const parsed = Date.parse(val);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return val;
}

function serializeJson(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  return JSON.parse(JSON.stringify(value, dateReplacer));
}

function deserializeJson<T>(value: unknown): T {
  if (value === null || value === undefined) {
    return value as T;
  }
  return JSON.parse(JSON.stringify(value), dateReviver) as T;
}

function serializeDate(value: Date | string | undefined): string | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : value;
}

function deserializeDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value as string);
}

function serializeOptionalJson(value: unknown | undefined): unknown | null {
  if (value === undefined) {
    return null;
  }
  return serializeJson(value);
}

function addOptionalUserId(row: DbRow, userId?: string): DbRow {
  if (userId !== undefined) {
    row.user_id = userId;
  }
  return row;
}

function buildWhereClause(
  keyOrWhere: unknown,
  primaryKey: PrimaryKey
): { columns: string[]; values: unknown[] } {
  if (Array.isArray(keyOrWhere)) {
    if (!Array.isArray(primaryKey)) {
      throw new Error("Composite key provided for non-composite table.");
    }
    if (keyOrWhere.length !== primaryKey.length) {
      throw new Error("Composite key length mismatch.");
    }
    return {
      columns: primaryKey,
      values: keyOrWhere,
    };
  }

  if (
    keyOrWhere !== null &&
    typeof keyOrWhere === "object" &&
    !Array.isArray(keyOrWhere)
  ) {
    const entries = Object.entries(keyOrWhere as Record<string, unknown>);
    if (entries.length === 0) {
      throw new Error("Empty where clause.");
    }
    return {
      columns: entries.map(([key]) => key),
      values: entries.map(([, value]) => value),
    };
  }

  if (Array.isArray(primaryKey)) {
    throw new Error("Composite primary key requires array input.");
  }

  return { columns: [primaryKey], values: [keyOrWhere] };
}

function makePartialSerializer<T>(
  serializers: Record<
    string,
    { column: string; serialize: (value: unknown) => unknown }
  >
): (value: Partial<T>) => DbRow {
  return (value: Partial<T>) => {
    const row: DbRow = {};
    for (const [key, val] of Object.entries(value)) {
      const serializer = serializers[key];
      if (!serializer) {
        continue;
      }
      row[serializer.column] = serializer.serialize(val);
    }
    return row;
  };
}

const deckCodec: TableCodec<Deck> = {
  name: "decks",
  primaryKey: "id",
  toRow: (deck) =>
    addOptionalUserId(
      {
        id: deck.id,
        name: deck.name,
        sub_decks: serializeJson(deck.subDecks),
        super_decks: serializeOptionalJson(deck.superDecks),
        cards: serializeJson(deck.cards),
        notes: serializeJson(deck.notes),
        description: deck.description ?? null,
        options: serializeJson(deck.options),
      },
      deck.userId
    ),
  fromRow: (row) => ({
    id: row.id as string,
    name: row.name as string,
    userId: (row.user_id as string | null) ?? undefined,
    subDecks: deserializeJson<string[]>(row.sub_decks),
    superDecks: row.super_decks
      ? deserializeJson<string[]>(row.super_decks)
      : undefined,
    cards: deserializeJson<string[]>(row.cards),
    notes: deserializeJson<string[]>(row.notes),
    description: (row.description as string | null) ?? undefined,
    options: deserializeJson(row.options),
  }),
  toPartialRow: makePartialSerializer<Deck>({
    id: { column: "id", serialize: (value) => value },
    name: { column: "name", serialize: (value) => value },
    userId: { column: "user_id", serialize: (value) => value ?? null },
    subDecks: {
      column: "sub_decks",
      serialize: (value) => serializeJson(value),
    },
    superDecks: {
      column: "super_decks",
      serialize: (value) => serializeOptionalJson(value),
    },
    cards: { column: "cards", serialize: (value) => serializeJson(value) },
    notes: { column: "notes", serialize: (value) => serializeJson(value) },
    description: { column: "description", serialize: (value) => value ?? null },
    options: { column: "options", serialize: (value) => serializeJson(value) },
  }),
};

const DECK_SUMMARY_CHUNK_SIZE = 200;

function deckSummaryFromRow(row: DbRow): DeckSummary {
  return {
    id: row.id as string,
    name: row.name as string,
    subDecks: deserializeJson<string[]>(row.sub_decks),
    superDecks: row.super_decks
      ? deserializeJson<string[]>(row.super_decks)
      : undefined,
    description: (row.description as string | null) ?? undefined,
    options: deserializeJson(row.options),
  };
}

const cardCodec: TableCodec<Card<NoteType>> = {
  name: "cards",
  primaryKey: "id",
  toRow: (card) =>
    addOptionalUserId(
      {
        id: card.id,
        note: card.note,
        deck: card.deck,
        creation_date: serializeDate(card.creationDate),
        custom_order: card.customOrder ?? null,
        history: serializeJson(card.history),
        model: serializeJson(card.model),
        content: serializeJson(card.content),
      },
      card.userId
    ),
  fromRow: (row) => ({
    id: row.id as string,
    note: row.note as string,
    deck: row.deck as string,
    userId: (row.user_id as string | null) ?? undefined,
    creationDate: deserializeDate(row.creation_date),
    customOrder: (row.custom_order as number | null) ?? undefined,
    history: deserializeJson(row.history),
    model: deserializeJson(row.model),
    content: deserializeJson(row.content),
  }),
  toPartialRow: makePartialSerializer<Card<NoteType>>({
    id: { column: "id", serialize: (value) => value },
    note: { column: "note", serialize: (value) => value },
    deck: { column: "deck", serialize: (value) => value },
    userId: { column: "user_id", serialize: (value) => value ?? null },
    creationDate: {
      column: "creation_date",
      serialize: (value) => serializeDate(value as Date | string | undefined),
    },
    customOrder: {
      column: "custom_order",
      serialize: (value) => value ?? null,
    },
    history: { column: "history", serialize: (value) => serializeJson(value) },
    model: { column: "model", serialize: (value) => serializeJson(value) },
    content: { column: "content", serialize: (value) => serializeJson(value) },
  }),
};

const noteCodec: TableCodec<Note<NoteType>> = {
  name: "notes",
  primaryKey: "id",
  toRow: (note) =>
    addOptionalUserId(
      {
        id: note.id,
        deck: note.deck,
        creation_date: serializeDate(note.creationDate),
        custom_order: note.customOrder ?? null,
        content: serializeJson(note.content),
        sort_field: note.sortField,
      },
      note.userId
    ),
  fromRow: (row) => ({
    id: row.id as string,
    deck: row.deck as string,
    userId: (row.user_id as string | null) ?? undefined,
    creationDate: deserializeDate(row.creation_date),
    customOrder: (row.custom_order as number | null) ?? undefined,
    content: deserializeJson(row.content),
    sortField: row.sort_field as string,
  }),
  toPartialRow: makePartialSerializer<Note<NoteType>>({
    id: { column: "id", serialize: (value) => value },
    deck: { column: "deck", serialize: (value) => value },
    userId: { column: "user_id", serialize: (value) => value ?? null },
    creationDate: {
      column: "creation_date",
      serialize: (value) => serializeDate(value as Date | string | undefined),
    },
    customOrder: {
      column: "custom_order",
      serialize: (value) => value ?? null,
    },
    content: { column: "content", serialize: (value) => serializeJson(value) },
    sortField: { column: "sort_field", serialize: (value) => value },
  }),
};

const statisticsCodec: TableCodec<DeckStatistics> = {
  name: "statistics",
  primaryKey: ["deck", "day"],
  toRow: (statistics) =>
    addOptionalUserId(
      {
        deck: statistics.deck,
        day: statistics.day,
        time: serializeJson(statistics.time),
        cards: serializeJson(statistics.cards),
        ratings_list: serializeJson(statistics.ratingsList),
      },
      statistics.userId
    ),
  fromRow: (row) => ({
    deck: row.deck as string,
    day: row.day as string,
    userId: (row.user_id as string | null) ?? undefined,
    time: deserializeJson(row.time),
    cards: deserializeJson(row.cards),
    ratingsList: deserializeJson(row.ratings_list),
  }),
  toPartialRow: makePartialSerializer<DeckStatistics>({
    deck: { column: "deck", serialize: (value) => value },
    day: { column: "day", serialize: (value) => value },
    userId: { column: "user_id", serialize: (value) => value ?? null },
    time: { column: "time", serialize: (value) => serializeJson(value) },
    cards: { column: "cards", serialize: (value) => serializeJson(value) },
    ratingsList: {
      column: "ratings_list",
      serialize: (value) => serializeJson(value),
    },
  }),
};

const settingsCodec: TableCodec<Settings<keyof SettingsValues>> = {
  name: "settings",
  primaryKey: "key",
  toRow: (setting) =>
    addOptionalUserId(
      {
        key: setting.key,
        value: serializeJson(setting.value),
      },
      setting.userId
    ),
  fromRow: (row) => ({
    key: row.key as keyof SettingsValues,
    value: deserializeJson(row.value),
    userId: (row.user_id as string | null) ?? undefined,
  }),
  toPartialRow: makePartialSerializer<Settings<keyof SettingsValues>>({
    key: { column: "key", serialize: (value) => value },
    value: { column: "value", serialize: (value) => serializeJson(value) },
    userId: { column: "user_id", serialize: (value) => value ?? null },
  }),
};

const dailyNewCardsCodec: TableCodec<DailyNewCards> = {
  name: "daily_new_cards",
  primaryKey: "day",
  toRow: (row) =>
    addOptionalUserId(
      {
        day: row.day,
        count: row.count,
      },
      row.userId
    ),
  fromRow: (row) => ({
    day: row.day as string,
    count: row.count as number,
    userId: (row.user_id as string | null) ?? undefined,
  }),
  toPartialRow: makePartialSerializer<DailyNewCards>({
    day: { column: "day", serialize: (value) => value },
    count: { column: "count", serialize: (value) => value },
    userId: { column: "user_id", serialize: (value) => value ?? null },
  }),
};

class ApiDatabase {
  public decks: ApiTable<Deck>;
  public cards: ApiTable<Card<NoteType>>;
  public notes: ApiTable<Note<NoteType>>;
  public statistics: ApiTable<DeckStatistics>;
  public settings: ApiTable<Settings<keyof SettingsValues>>;
  public dailyNewCards: ApiTable<DailyNewCards>;

  public constructor() {
    this.decks = new ApiTable<Deck>(deckCodec);
    this.cards = new ApiTable<Card<NoteType>>(cardCodec);
    this.notes = new ApiTable<Note<NoteType>>(noteCodec);
    this.statistics = new ApiTable<DeckStatistics>(statisticsCodec);
    this.settings = new ApiTable<Settings<keyof SettingsValues>>(settingsCodec);
    this.dailyNewCards = new ApiTable<DailyNewCards>(dailyNewCardsCodec);
  }

  public async transaction<T>(_mode: string, ...args: unknown[]): Promise<T> {
    const callback = args[args.length - 1] as () => T | Promise<T>;
    transactionDepth += 1;
    try {
      const result = await callback();
      transactionDepth -= 1;
      if (
        transactionDepth === 0 &&
        pendingNotify &&
        notificationSuppressionDepth === 0
      ) {
        pendingNotify = false;
        notifyDbChanges();
      }
      return result;
    } catch (error) {
      transactionDepth = Math.max(0, transactionDepth - 1);
      pendingNotify = false;
      throw error;
    }
  }

  public async delete(): Promise<void> {
    await apiRequest("/admin/clear", { method: "POST" });
    markChanged();
  }
}

class ApiTable<T> {
  private name: string;
  private primaryKey: PrimaryKey;
  private toRow: (value: T) => DbRow;
  private fromRow: (row: DbRow) => T;
  private toPartialRow: (value: Partial<T>) => DbRow;
  private static readonly BULK_CHUNK_SIZE = 200;

  public constructor(codec: TableCodec<T>) {
    this.name = codec.name;
    this.primaryKey = codec.primaryKey;
    this.toRow = codec.toRow;
    this.fromRow = codec.fromRow;
    this.toPartialRow = codec.toPartialRow;
  }

  public async get(keyOrWhere: unknown): Promise<T | undefined> {
    const { columns, values } = buildWhereClause(keyOrWhere, this.primaryKey);
    const response = await apiRequest<{ row: DbRow | null }>(
      `/tables/${this.name}/get`,
      {
        method: "POST",
        body: JSON.stringify({
          where: { columns, values },
        }),
      }
    );
    if (!response?.row) {
      return undefined;
    }
    return this.fromRow(response.row);
  }

  public async add(value: T): Promise<void> {
    const row = this.toRow(value);
    await apiRequest(`/tables/${this.name}/insert`, {
      method: "POST",
      body: JSON.stringify({ row }),
    });
    markChanged();
  }

  public async put(value: T): Promise<void> {
    const row = this.toRow(value);
    await apiRequest(`/tables/${this.name}/upsert`, {
      method: "POST",
      body: JSON.stringify({ row }),
    });
    markChanged();
  }

  public async update(
    keyOrObject: unknown,
    changes: Partial<T>
  ): Promise<void> {
    const { columns, values } = buildWhereClause(
      this.extractKey(keyOrObject),
      this.primaryKey
    );
    const row = this.toPartialRow(changes);
    if (Object.keys(row).length === 0) {
      return;
    }
    await apiRequest(`/tables/${this.name}/update`, {
      method: "POST",
      body: JSON.stringify({
        where: { columns, values },
        changes: row,
      }),
    });
    markChanged();
  }

  public async delete(keyOrObject: unknown): Promise<void> {
    const { columns, values } = buildWhereClause(
      this.extractKey(keyOrObject),
      this.primaryKey
    );
    await apiRequest(`/tables/${this.name}/delete`, {
      method: "POST",
      body: JSON.stringify({
        where: { columns, values },
      }),
    });
    markChanged();
  }

  public async bulkGet(keys: unknown[]): Promise<Array<T | undefined>> {
    if (keys.length === 0) {
      return [];
    }
    if (Array.isArray(this.primaryKey)) {
      throw new Error("bulkGet does not support composite primary keys.");
    }

    const queue = getGlobalRequestQueue();

    // 为每个 chunk 创建请求任务
    const chunkPromises: Promise<Map<string, T>>[] = [];

    for (
      let index = 0;
      index < keys.length;
      index += ApiTable.BULK_CHUNK_SIZE
    ) {
      const chunk = keys.slice(index, index + ApiTable.BULK_CHUNK_SIZE);

      // 创建请求函数
      const requestFn = async (): Promise<Map<string, T>> => {
        const response = await apiRequest<{ rows: DbRow[] }>(
          `/tables/${this.name}/bulk-get`,
          {
            method: "POST",
            body: JSON.stringify({ keys: chunk }),
          }
        );
        const byKey = new Map<string, T>();
        (response?.rows ?? []).forEach((row) => {
          const key = (row as DbRow)[this.primaryKey as string] as string;
          byKey.set(key, this.fromRow(row as DbRow));
        });
        return byKey;
      };

      chunkPromises.push(queue.add(requestFn));
    }

    // 等待所有 chunk 完成
    const results = await Promise.all(chunkPromises);

    // 合并所有结果
    const byKey = new Map<string, T>();
    for (const result of results) {
      result.forEach((value, key) => {
        byKey.set(key, value);
      });
    }

    return keys.map((key) => byKey.get(String(key)));
  }

  public async bulkAdd(values: T[]): Promise<void> {
    if (values.length === 0) {
      return;
    }

    const queue = getGlobalRequestQueue();
    const promises: Promise<void>[] = [];

    for (
      let index = 0;
      index < values.length;
      index += ApiTable.BULK_CHUNK_SIZE
    ) {
      const chunk = values.slice(index, index + ApiTable.BULK_CHUNK_SIZE);
      const rows = chunk.map((value) => this.toRow(value));

      const requestFn = async (): Promise<void> => {
        await apiRequest(`/tables/${this.name}/bulk-add`, {
          method: "POST",
          body: JSON.stringify({ rows }),
        });
      };

      promises.push(queue.add(requestFn));
    }

    await Promise.all(promises);
    markChanged();
  }

  public async bulkDelete(keys: unknown[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }
    if (Array.isArray(this.primaryKey)) {
      throw new Error("bulkDelete does not support composite primary keys.");
    }

    const queue = getGlobalRequestQueue();
    const promises: Promise<void>[] = [];

    for (
      let index = 0;
      index < keys.length;
      index += ApiTable.BULK_CHUNK_SIZE
    ) {
      const chunk = keys.slice(index, index + ApiTable.BULK_CHUNK_SIZE);

      const requestFn = async (): Promise<void> => {
        await apiRequest(`/tables/${this.name}/bulk-delete`, {
          method: "POST",
          body: JSON.stringify({ keys: chunk }),
        });
      };

      promises.push(queue.add(requestFn));
    }

    await Promise.all(promises);
    markChanged();
  }

  public async toArray(): Promise<T[]> {
    const response = await apiRequest<{ rows: DbRow[] }>(
      `/tables/${this.name}/all`
    );
    return (response?.rows ?? []).map((row) => this.fromRow(row));
  }

  public async whereIn(column: string, values: unknown[]): Promise<T[]> {
    if (values.length === 0) {
      return [];
    }

    const queue = getGlobalRequestQueue();
    const chunkPromises: Promise<T[]>[] = [];

    for (
      let index = 0;
      index < values.length;
      index += ApiTable.BULK_CHUNK_SIZE
    ) {
      const chunk = values.slice(index, index + ApiTable.BULK_CHUNK_SIZE);

      const requestFn = async (): Promise<T[]> => {
        const response = await apiRequest<{ rows: DbRow[] }>(
          `/tables/${this.name}/where-in`,
          {
            method: "POST",
            body: JSON.stringify({ column, values: chunk }),
          }
        );
        return (response?.rows ?? []).map((row) => this.fromRow(row));
      };

      chunkPromises.push(queue.add(requestFn));
    }

    const results = await Promise.all(chunkPromises);
    return results.flat();
  }

  public async count(
    filters?: Array<{
      column: string;
      op: "eq" | "lt" | "lte" | "gt" | "gte" | "in" | "is";
      value: unknown;
    }>
  ): Promise<number> {
    const response = await apiRequest<{ count: number }>(
      `/tables/${this.name}/count`,
      {
        method: "POST",
        body: JSON.stringify({ filters: filters ?? [] }),
      }
    );
    return response?.count ?? 0;
  }

  public where(columnOrWhere: string | Record<string, unknown>): ApiQuery<T> {
    if (typeof columnOrWhere === "string") {
      return new ApiQuery<T>(this, columnOrWhere);
    }
    return new ApiQuery<T>(this, undefined, columnOrWhere);
  }

  public getPrimaryKey(): PrimaryKey {
    return this.primaryKey;
  }

  private extractKey(keyOrObject: unknown): unknown {
    if (
      keyOrObject !== null &&
      typeof keyOrObject === "object" &&
      !Array.isArray(keyOrObject)
    ) {
      if (Array.isArray(this.primaryKey)) {
        return this.primaryKey.map(
          (key) => (keyOrObject as Record<string, unknown>)[key]
        );
      }
      return (keyOrObject as Record<string, unknown>)[this.primaryKey];
    }
    return keyOrObject;
  }

  public async query(whereClause: {
    columns: string[];
    values: unknown[];
  }): Promise<T[]> {
    const response = await apiRequest<{ rows: DbRow[] }>(
      `/tables/${this.name}/query`,
      {
        method: "POST",
        body: JSON.stringify({ where: whereClause }),
      }
    );
    return (response?.rows ?? []).map((row) => this.fromRow(row));
  }

  public async modify(
    whereClause: { columns: string[]; values: unknown[] },
    changes: Partial<T>
  ): Promise<void> {
    const row = this.toPartialRow(changes);
    if (Object.keys(row).length === 0) {
      return;
    }
    await apiRequest(`/tables/${this.name}/update`, {
      method: "POST",
      body: JSON.stringify({
        where: whereClause,
        changes: row,
      }),
    });
    markChanged();
  }
}

class ApiQuery<T> {
  private table: ApiTable<T>;
  private column?: string;
  private whereObject?: Record<string, unknown>;

  public constructor(
    table: ApiTable<T>,
    column?: string,
    whereObject?: Record<string, unknown>
  ) {
    this.table = table;
    this.column = column;
    this.whereObject = whereObject;
  }

  public equals(value: unknown): ApiQuery<T> {
    if (!this.column) {
      throw new Error("equals() requires a column.");
    }
    this.whereObject = { [this.column]: value };
    return this;
  }

  public async toArray(): Promise<T[]> {
    if (!this.whereObject) {
      return this.table.toArray();
    }
    return this.table.query(
      buildWhereClause(this.whereObject, this.table.getPrimaryKey())
    );
  }

  public async modify(changes: Partial<T>): Promise<void> {
    if (!this.whereObject) {
      return;
    }
    await this.table.modify(
      buildWhereClause(this.whereObject, this.table.getPrimaryKey()),
      changes
    );
  }
}

export const db = new ApiDatabase();

export async function getDeckSummary(
  deckId: string
): Promise<DeckSummary | undefined> {
  const response = await apiRequest<{ row: DbRow | null }>(
    `/decks/summaries/${deckId}`
  );
  if (!response?.row) {
    return undefined;
  }
  return deckSummaryFromRow(response.row);
}

export async function getDeckSummaries(): Promise<DeckSummary[]> {
  const response = await apiRequest<{ rows: DbRow[] }>("/decks/summaries");
  return (response?.rows ?? []).map((row) => deckSummaryFromRow(row));
}

export async function getDeckSummariesByIds(
  ids: string[]
): Promise<Array<DeckSummary | undefined>> {
  if (ids.length === 0) {
    return [];
  }

  const queue = getGlobalRequestQueue();
  const chunkPromises: Promise<Map<string, DeckSummary>>[] = [];

  for (let index = 0; index < ids.length; index += DECK_SUMMARY_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + DECK_SUMMARY_CHUNK_SIZE);

    const requestFn = async (): Promise<Map<string, DeckSummary>> => {
      const response = await apiRequest<{ rows: DbRow[] }>(
        "/decks/summaries/bulk",
        {
          method: "POST",
          body: JSON.stringify({ ids: chunk }),
        }
      );
      const byId = new Map<string, DeckSummary>();
      (response?.rows ?? []).forEach((row) => {
        const summary = deckSummaryFromRow(row);
        byId.set(summary.id, summary);
      });
      return byId;
    };

    chunkPromises.push(queue.add(requestFn));
  }

  const results = await Promise.all(chunkPromises);

  const byId = new Map<string, DeckSummary>();
  for (const result of results) {
    result.forEach((value, key) => {
      byId.set(key, value);
    });
  }

  return ids.map((id) => byId.get(id));
}

export type DatabaseExport = {
  decks: Deck[];
  cards: Array<Card<NoteType>>;
  notes: Array<Note<NoteType>>;
  statistics: DeckStatistics[];
  settings: Array<Settings<keyof SettingsValues>>;
  dailyNewCards: DailyNewCards[];
};

export async function exportDatabase(): Promise<DatabaseExport> {
  const [decks, cards, notes, statistics, settings, dailyNewCards] =
    await Promise.all([
      db.decks.toArray(),
      db.cards.toArray(),
      db.notes.toArray(),
      db.statistics.toArray(),
      db.settings.toArray(),
      db.dailyNewCards.toArray(),
    ]);

  return {
    decks,
    cards,
    notes,
    statistics,
    settings,
    dailyNewCards,
  };
}

export function serializeDatabaseExport(data: DatabaseExport): string {
  return JSON.stringify(data, dateReplacer, 2);
}

export function deserializeDatabaseExport(text: string): DatabaseExport {
  const parsed = JSON.parse(text, dateReviver) as Partial<DatabaseExport>;
  const parsedAny = parsed as Record<string, unknown>;

  function pickArray<T = unknown>(...keys: string[]): T[] {
    for (let index = 0; index < keys.length; index += 1) {
      const value = parsedAny[keys[index]];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }
    return [];
  }

  return {
    decks: pickArray<Deck>("decks"),
    cards: pickArray<Card<NoteType>>("cards"),
    notes: pickArray<Note<NoteType>>("notes"),
    statistics: pickArray<DeckStatistics>("statistics"),
    settings: pickArray<Settings<keyof SettingsValues>>("settings"),
    dailyNewCards: pickArray<DailyNewCards>("dailyNewCards", "daily_new_cards"),
  };
}

async function bindImportedDataToCurrentUser(
  data: DatabaseExport
): Promise<DatabaseExport> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Authentication required for import.");
  }
  return {
    decks: data.decks.map((deck) => ({ ...deck, userId })),
    cards: data.cards.map((card) => ({ ...card, userId })),
    notes: data.notes.map((note) => ({ ...note, userId })),
    statistics: data.statistics.map((row) => ({ ...row, userId })),
    settings: data.settings.map((setting) => ({ ...setting, userId })),
    dailyNewCards: data.dailyNewCards.map((row) => ({ ...row, userId })),
  };
}

export async function importDatabase(
  data: DatabaseExport,
  options: { overwriteValues: boolean }
): Promise<void> {
  function createId(): string {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function remapImportedIds(input: DatabaseExport): DatabaseExport {
    const deckIdMap = new Map<string, string>();
    const noteIdMap = new Map<string, string>();
    const cardIdMap = new Map<string, string>();

    input.decks.forEach((deck) => {
      if (!deckIdMap.has(deck.id)) {
        deckIdMap.set(deck.id, createId());
      }
    });
    input.notes.forEach((note) => {
      if (!noteIdMap.has(note.id)) {
        noteIdMap.set(note.id, createId());
      }
    });
    input.cards.forEach((card) => {
      if (!cardIdMap.has(card.id)) {
        cardIdMap.set(card.id, createId());
      }
    });

    const decks = input.decks.map((deck) => ({
      ...deck,
      id: deckIdMap.get(deck.id) || createId(),
      subDecks: deck.subDecks.map(
        (subDeckId) => deckIdMap.get(subDeckId) || subDeckId
      ),
      superDecks: deck.superDecks?.map(
        (superDeckId) => deckIdMap.get(superDeckId) || superDeckId
      ),
      cards: deck.cards.map((cardId) => cardIdMap.get(cardId) || cardId),
      notes: deck.notes.map((noteId) => noteIdMap.get(noteId) || noteId),
    }));

    const notes = input.notes.map((note) => ({
      ...note,
      id: noteIdMap.get(note.id) || createId(),
      deck: deckIdMap.get(note.deck) || note.deck,
    }));

    const cards = input.cards.map((card) => ({
      ...card,
      id: cardIdMap.get(card.id) || createId(),
      note: noteIdMap.get(card.note) || card.note,
      deck: deckIdMap.get(card.deck) || card.deck,
    }));

    const statistics = input.statistics.map((row) => ({
      ...row,
      deck: deckIdMap.get(row.deck) || row.deck,
    }));

    return {
      decks,
      cards,
      notes,
      statistics,
      settings: input.settings,
      dailyNewCards: input.dailyNewCards,
    };
  }

  const remapped = remapImportedIds(data);
  const normalized = await bindImportedDataToCurrentUser(remapped);

  async function upsertMany<T>(items: T[], put: (item: T) => Promise<void>) {
    for (let index = 0; index < items.length; index += 1) {
      await put(items[index]);
    }
  }

  if (options.overwriteValues) {
    await db.delete();
  }

  await db.transaction("rw", async () => {
    await upsertMany(normalized.decks, (value) => db.decks.put(value));
    await upsertMany(normalized.cards, (value) => db.cards.put(value));
    await upsertMany(normalized.notes, (value) => db.notes.put(value));
    await upsertMany(normalized.statistics, (value) =>
      db.statistics.put(value)
    );
    await upsertMany(normalized.settings, (value) => db.settings.put(value));
    await upsertMany(normalized.dailyNewCards, (value) =>
      db.dailyNewCards.put(value)
    );
  });
}
