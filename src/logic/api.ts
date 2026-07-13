import { getAccessToken } from "./auth";
import { recordRequestResult } from "./connectionStatus";

// 默认使用相对路径，这样通过 nginx 代理时无需手动配置
const DEFAULT_API_URL = "/api";
const API_BASE_STORAGE_KEY = "akasha_api_base_url";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 6000;
const ONLINE_WAIT_TIMEOUT_MS = 30000;

function normalizeBaseUrl(value: string): string {
  let normalized = value.trim();
  if (!normalized) {
    return "";
  }
  // 如果是相对路径（以 / 开头），直接返回，不要添加 http://
  if (normalized.startsWith("/")) {
    return normalized.replace(/\/$/, "");
  }
  // 否则添加 http:// 协议（如果没有）
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `http://${normalized}`;
  }
  return normalized.replace(/\/$/, "");
}

export function getDefaultApiBaseUrl(): string {
  // 始终使用 /api 作为默认值
  return DEFAULT_API_URL;
}

/**
 * 获取实际可用的 API 地址
 * 如果有 localStorage 配置则使用配置的地址
 * 否则返回默认地址（相对路径或环境变量）
 */
export function getEffectiveApiBaseUrl(): string {
  const stored = getStoredApiBaseUrl();
  if (stored) {
    return stored;
  }
  return getDefaultApiBaseUrl();
}

export function getStoredApiBaseUrl(): string | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  const stored = window.localStorage.getItem(API_BASE_STORAGE_KEY);
  if (!stored) {
    return null;
  }
  return normalizeBaseUrl(stored);
}

/**
 * 获取 API 基础地址
 * 优先使用 localStorage 中用户配置的地址
 * 否则使用默认地址（相对路径或环境变量）
 */
export function getApiBaseUrl(): string {
  return getStoredApiBaseUrl() || getEffectiveApiBaseUrl();
}

export function setApiBaseUrl(value: string): string {
  const normalized = normalizeBaseUrl(value);
  if (typeof window === "undefined" || !window.localStorage) {
    return normalized || getDefaultApiBaseUrl();
  }
  if (!normalized) {
    window.localStorage.removeItem(API_BASE_STORAGE_KEY);
    return getDefaultApiBaseUrl();
  }
  window.localStorage.setItem(API_BASE_STORAGE_KEY, normalized);
  return normalized;
}

export function clearApiBaseUrl(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(API_BASE_STORAGE_KEY);
}

export function getApiPrefix(): string {
  const baseUrl = getApiBaseUrl();
  // 如果 baseUrl 已经是 /api 结尾，就直接返回
  if (baseUrl.endsWith("/api")) {
    return baseUrl;
  }
  return `${baseUrl}/api`;
}

type ApiErrorPayload = {
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetriableStatus(status: number): boolean {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function isRetriableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "AbortError") {
    return true;
  }
  return (
    error.name === "TypeError" ||
    error.message.includes("Failed to fetch") ||
    error.message.includes("NetworkError")
  );
}

async function waitForOnline(): Promise<void> {
  if (typeof window === "undefined" || window.navigator.onLine) {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("online", handleOnline);
      resolve();
    }, ONLINE_WAIT_TIMEOUT_MS);

    const handleOnline = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("online", handleOnline);
      resolve();
    };

    window.addEventListener("online", handleOnline);
  });
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJsonSafely<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Authentication required.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    ...(options?.headers || {}),
  };

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    const attemptStartedAt = Date.now();
    try {
      const response = await fetchWithTimeout(
        `${getApiPrefix()}${path}`,
        {
          ...options,
          headers,
        },
        REQUEST_TIMEOUT_MS
      );

      if (response.ok) {
        recordRequestResult({
          ok: true,
          latencyMs: Date.now() - attemptStartedAt,
          retries: attempt - 1,
        });
        return parseJsonSafely<T>(response);
      }

      const finalAttempt = attempt >= MAX_RETRY_ATTEMPTS;
      if (!isRetriableStatus(response.status) || finalAttempt) {
        let message = `Request failed: ${response.status}`;
        try {
          const payload = await parseJsonSafely<ApiErrorPayload>(response);
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // ignore parse errors
        }
        recordRequestResult({
          ok: false,
          latencyMs: Date.now() - attemptStartedAt,
          retries: attempt - 1,
        });
        throw new Error(message);
      }
    } catch (error) {
      const finalAttempt = attempt >= MAX_RETRY_ATTEMPTS;
      if (!isRetriableError(error) || finalAttempt) {
        recordRequestResult({
          ok: false,
          latencyMs: Date.now() - attemptStartedAt,
          retries: attempt - 1,
        });
        throw error;
      }
      await waitForOnline();
    }

    const delay = Math.min(
      MAX_RETRY_DELAY_MS,
      INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1)
    );
    await sleep(delay);
  }

  recordRequestResult({
    ok: false,
    latencyMs: REQUEST_TIMEOUT_MS,
    retries: MAX_RETRY_ATTEMPTS - 1,
  });
  throw new Error("Request failed after retries.");
}

/**
 * 批量 TTS 请求接口
 * 用于一次性请求多个 TTS 音频
 */
export interface BatchTtsRequest {
  items: Array<{
    text: string;
    voice: string;
    rate: string;
  }>;
}

export interface BatchTtsResponse {
  results: Array<{
    text: string;
    voice: string;
    rate: string;
    audioBase64: string;
    contentType: string;
    error?: string;
  }>;
}

/**
 * 批量请求 TTS 音频
 * 返回 base64 编码的音频数据
 */
export async function batchTtsRequest(
  items: BatchTtsRequest["items"]
): Promise<BatchTtsResponse["results"]> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Authentication required.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await fetch(`${getApiPrefix()}/tts/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Batch TTS request failed: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.results || [];
}
