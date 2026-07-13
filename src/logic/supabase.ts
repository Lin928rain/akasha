import { SupabaseClient, createClient } from "@supabase/supabase-js";

const SUPABASE_URL_STORAGE_KEY = "akasha_supabase_url";
const SUPABASE_ANON_KEY_STORAGE_KEY = "akasha_supabase_anon_key";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

function normalizeBaseUrl(value: string): string {
  let normalized = value.trim();
  if (!normalized) {
    return "";
  }
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  return normalized.replace(/\/$/, "");
}

export function getDefaultSupabaseConfig(): SupabaseConfig {
  const url = normalizeBaseUrl(
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ""
  );
  const anonKey = (
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ""
  ).trim();
  return {
    url,
    anonKey,
  };
}

export function getStoredSupabaseConfig(): SupabaseConfig | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  const url = normalizeBaseUrl(
    window.localStorage.getItem(SUPABASE_URL_STORAGE_KEY) ?? ""
  );
  const anonKey = (
    window.localStorage.getItem(SUPABASE_ANON_KEY_STORAGE_KEY) ?? ""
  ).trim();
  if (!url || !anonKey) {
    return null;
  }
  return {
    url,
    anonKey,
  };
}

export function setStoredSupabaseConfig(
  config: SupabaseConfig
): SupabaseConfig {
  const normalized = {
    url: normalizeBaseUrl(config.url),
    anonKey: config.anonKey.trim(),
  };
  if (!normalized.url || !normalized.anonKey) {
    throw new Error("Supabase URL and anon key are required.");
  }
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(SUPABASE_URL_STORAGE_KEY, normalized.url);
    window.localStorage.setItem(
      SUPABASE_ANON_KEY_STORAGE_KEY,
      normalized.anonKey
    );
  }
  return normalized;
}

export function clearStoredSupabaseConfig(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(SUPABASE_URL_STORAGE_KEY);
  window.localStorage.removeItem(SUPABASE_ANON_KEY_STORAGE_KEY);
}

export function getResolvedSupabaseConfig(): SupabaseConfig | null {
  const stored = getStoredSupabaseConfig();
  if (stored) {
    return stored;
  }
  const fallback = getDefaultSupabaseConfig();
  if (!fallback.url || !fallback.anonKey) {
    return null;
  }
  return fallback;
}

let supabaseClient: SupabaseClient | null = null;
let supabaseClientKey = "";

export function getSupabaseClient(): SupabaseClient | null {
  const config = getResolvedSupabaseConfig();
  if (!config) {
    return null;
  }
  const nextKey = `${config.url}|${config.anonKey}`;
  if (!supabaseClient || supabaseClientKey !== nextKey) {
    supabaseClient = createClient(config.url, config.anonKey);
    supabaseClientKey = nextKey;
  }
  return supabaseClient;
}

export function getSupabaseClientOrThrow(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Please configure Supabase URL and anon key."
    );
  }
  return client;
}
