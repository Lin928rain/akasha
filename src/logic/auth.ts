// 默认使用相对路径 /api，配合 nginx 反向代理
const DEFAULT_API_URL = "/api";
const API_BASE_STORAGE_KEY = "akasha_api_base_url";
const SESSION_STORAGE_KEY = "akasha_auth_session";

export type Session = {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  user: {
    id: string;
    email: string | null;
  };
};

export type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT";

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

type AuthResponse = {
  session: {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number | null;
    user: {
      id: string;
      email: string | null;
    };
  } | null;
};

const listeners = new Set<AuthListener>();
const TOKEN_REFRESH_WINDOW_SECONDS = 60;

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

function getApiBaseUrl(): string {
  // 始终使用 /api 作为默认值，忽略环境变量
  const fallback = DEFAULT_API_URL;
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  const stored = normalizeBaseUrl(
    window.localStorage.getItem(API_BASE_STORAGE_KEY) || ""
  );
  // 如果有存储的配置用存储的，否则用 fallback
  return stored || fallback;
}

function toSession(
  payload: AuthResponse["session"],
  previous: Session | null = null
): Session | null {
  if (!payload?.accessToken || !payload.user?.id) {
    return null;
  }
  return {
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken ?? previous?.refresh_token ?? null,
    expires_at:
      typeof payload.expiresAt === "number"
        ? payload.expiresAt
        : previous?.expires_at ?? null,
    user: {
      id: payload.user.id,
      email: payload.user.email || null,
    },
  };
}

function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function isTokenExpiring(session: Session): boolean {
  if (typeof session.expires_at !== "number") {
    return false;
  }
  return session.expires_at - nowUnixSeconds() <= TOKEN_REFRESH_WINDOW_SECONDS;
}

function isTokenExpired(session: Session): boolean {
  if (typeof session.expires_at !== "number") {
    return false;
  }
  return session.expires_at <= nowUnixSeconds();
}

function readStoredSession(): Session | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.access_token || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: Session | null): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function notify(event: AuthChangeEvent, session: Session | null): void {
  listeners.forEach((listener) => listener(event, session));
}

async function postAuth(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text
    ? (JSON.parse(text) as AuthResponse & { error?: string })
    : null;

  if (!response.ok) {
    throw new Error(
      payload?.error || `Authentication failed (${response.status}).`
    );
  }
  return payload;
}

async function refreshWithToken(
  refreshToken: string,
  previous: Session | null = null
): Promise<Session | null> {
  const payload = await postAuth("/auth/refresh", { refreshToken });
  return toSession(payload?.session || null, previous);
}

export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<void> {
  const payload = await postAuth("/auth/signin", { email, password });
  const session = toSession(payload?.session || null);
  if (!session) {
    throw new Error("Invalid authentication response.");
  }
  writeStoredSession(session);
  notify("SIGNED_IN", session);
}

export async function signUpWithEmailPassword(
  email: string,
  password: string
): Promise<void> {
  const payload = await postAuth("/auth/signup", { email, password });
  const session = toSession(payload?.session || null);
  if (!session) {
    throw new Error("Invalid authentication response.");
  }
  writeStoredSession(session);
  notify("SIGNED_IN", session);
}

export async function signOut(): Promise<void> {
  const session = readStoredSession();
  writeStoredSession(null);
  notify("SIGNED_OUT", null);
  if (!session?.access_token) {
    return;
  }
  try {
    await fetch(`${getApiBaseUrl()}/auth/signout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    // Ignore signout network errors because local session is already cleared.
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  const session = readStoredSession();
  if (!session?.access_token) {
    return null;
  }

  if (session.refresh_token && isTokenExpiring(session)) {
    try {
      const refreshed = await refreshWithToken(session.refresh_token, session);
      if (refreshed) {
        writeStoredSession(refreshed);
        return refreshed;
      }
    } catch {
      // Fall back to server validation below.
    }
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!response.ok) {
      if (session.refresh_token) {
        try {
          const refreshed = await refreshWithToken(
            session.refresh_token,
            session
          );
          if (refreshed) {
            writeStoredSession(refreshed);
            return refreshed;
          }
        } catch {
          // Continue to clear local session below.
        }
      }
      writeStoredSession(null);
      return null;
    }
    const payload = (await response.json()) as AuthResponse;
    const nextSession = toSession(payload?.session || null, session);
    if (!nextSession) {
      writeStoredSession(null);
      return null;
    }
    writeStoredSession(nextSession);
    return nextSession;
  } catch {
    // Keep local session during transient network errors.
    return session;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const session = readStoredSession();
  if (!session?.access_token) {
    return null;
  }

  if (!session.refresh_token) {
    if (isTokenExpired(session)) {
      writeStoredSession(null);
      return null;
    }
    return session.access_token;
  }

  if (isTokenExpiring(session)) {
    try {
      const refreshed = await refreshWithToken(session.refresh_token, session);
      if (refreshed) {
        writeStoredSession(refreshed);
        return refreshed.access_token;
      }
    } catch {
      if (isTokenExpired(session)) {
        writeStoredSession(null);
        return null;
      }
    }
  }

  return session.access_token;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = readStoredSession();
  return session?.user.id ?? null;
}

export function onAuthStateChange(callback: AuthListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * 修改用户密码
 * @param currentPassword 当前密码
 * @param newPassword 新密码
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const session = readStoredSession();
  if (!session?.access_token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      payload?.error || `Change password failed (${response.status}).`
    );
  }
}
