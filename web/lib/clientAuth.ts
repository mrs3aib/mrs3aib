"use client";

/**
 * Client-gallery auth for the public site.
 *
 * Clients log in with their phone number and a password — the phone number is
 * the unique identifier, standing in for an email address — and receive a
 * short-lived access token. The refresh token is an httpOnly cookie set by the
 * server, so it is never visible here.
 *
 * The access token is held in memory and mirrored into sessionStorage so a page
 * reload does not force a re-login. sessionStorage (not localStorage) is
 * deliberate: it dies with the tab, which suits a token granting access to
 * someone's private photographs on a possibly shared computer.
 */

/**
 * API origin with any trailing slash removed.
 *
 * Every path below starts with "/", so a base URL ending in one builds
 * "//public/sessions". Express routes that as a distinct path and answers 404,
 * so the entire site fails against a perfectly healthy API over one invisible
 * character in an environment variable. Empty stays empty: `isBackendConfigured`
 * treats "" as "no backend", which must keep working.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
const STORAGE_KEY = "s3aib.client.token";

/** Cap on buffering a file into memory before falling back to a direct link. */

export type ClientProfile = {
  id: string;
  name: string;
  phone: string;
  /** Null until an admin attaches this account to a shoot. */
  sessionId: string | null;
};

export type ClientSession = {
  accessToken: string;
  client: ClientProfile;
};

let memoryToken: string | null = null;

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  memoryToken = window.sessionStorage.getItem(STORAGE_KEY);
  return memoryToken;
}

export function setToken(token: string | null): void {
  memoryToken = token;
  if (typeof window === "undefined") return;
  if (token) window.sessionStorage.setItem(STORAGE_KEY, token);
  else window.sessionStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function apiConfigured(): boolean {
  return API_BASE.length > 0;
}

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  if (!API_BASE) throw new ApiError("Backend is not configured", 0);

  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include", // send/receive the refresh cookie
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  // Access tokens live ~15 minutes; transparently rotate once and retry.
  if (res.status === 401 && retryOnUnauthorized) {
    const refreshed = await refresh();
    if (refreshed) return request<T>(path, init, false);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* keep the default */
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function register(input: {
  name: string;
  phone: string;
  password: string;
}): Promise<ClientSession> {
  const session = await request<ClientSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
  setToken(session.accessToken);
  return session;
}

export async function login(phone: string, password: string): Promise<ClientSession> {
  const session = await request<ClientSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password })
  });
  setToken(session.accessToken);
  return session;
}

/**
 * Change the signed-in client's password.
 *
 * The server revokes every refresh token for the account, so the local token
 * is dropped too and the caller must send the client back to the sign-in form.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await request<void>("/auth/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword })
  });
  setToken(null);
}

export function fetchProfile(): Promise<{ client: ClientProfile }> {
  return request<{ client: ClientProfile }>("/auth/me");
}

/** Exchange the refresh cookie for a new access token. Returns success. */
export async function refresh(): Promise<boolean> {
  if (!API_BASE) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) {
      setToken(null);
      return false;
    }
    const body = (await res.json()) as { accessToken?: string };
    if (!body.accessToken) return false;
    setToken(body.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    await request<void>("/auth/logout", { method: "POST" }, false);
  } catch {
    /* log out locally regardless */
  }
  setToken(null);
}

// --- gallery + downloads -------------------------------------------------

export type ClientMedia = {
  id: string;
  type: "image" | "video";
  originalName: string;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
};

export type ClientGallery = {
  session: {
    id: string;
    title: string;
    eventDate: string;
    location: string;
    description: string | null;
  };
  media: ClientMedia[];
};

export function fetchOwnGallery(): Promise<ClientGallery> {
  return request<ClientGallery>("/gallery");
}

export function fetchSingleDownloadUrl(mediaId: string): Promise<{ url: string }> {
  return request<{ url: string }>(`/download/${mediaId}`);
}

export async function fetchMultipleDownloadUrls(
  mediaIds: string[]
): Promise<{ mediaId: string; url: string }[]> {
  // The endpoint wraps its array in `files`; unwrap so callers get the list.
  const body = await request<{ files: { mediaId: string; url: string }[] }>(
    "/download/multiple",
    { method: "POST", body: JSON.stringify({ mediaIds }) }
  );
  return body.files;
}

/** Build (or reuse) a ZIP of just the selected media. */
export function fetchSelectionZipUrl(
  sessionId: string,
  mediaIds: string[]
): Promise<{ url: string }> {
  return request<{ url: string }>(`/download/session/${sessionId}/selection`, {
    method: "POST",
    body: JSON.stringify({ mediaIds })
  });
}

/** Build (or reuse) the whole-session ZIP. Can take a while on large galleries. */
export function fetchSessionZipUrl(sessionId: string): Promise<{ url: string }> {
  return request<{ url: string }>(`/download/session/${sessionId}`, { method: "POST" });
}

export { ApiError };
