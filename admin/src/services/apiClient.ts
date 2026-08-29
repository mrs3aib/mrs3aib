import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import type { RefreshResponse } from "@/types/auth";

const baseURL = import.meta.env.VITE_API_BASE_URL as string;

export const apiClient = axios.create({
  baseURL,
  withCredentials: true
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<string> | null = null;

async function requestRefresh(timeoutMs?: number): Promise<string> {
  const { data } = await axios.post<RefreshResponse>(
    `${baseURL}/admin/auth/refresh`,
    {},
    { withCredentials: true, ...(timeoutMs ? { timeout: timeoutMs } : {}) }
  );
  useAuthStore.getState().setAccessToken(data.accessToken);
  return data.accessToken;
}

/**
 * Refresh the access token, collapsing concurrent callers onto one request.
 *
 * Refresh tokens rotate server-side: the used one is revoked as the new pair
 * is issued. Two refreshes in flight at once therefore means the second
 * arrives holding an already-revoked token and fails, which would sign the
 * admin out mid-session. Every caller — the response interceptor and the
 * startup bootstrap alike — must share this promise.
 */
export function refreshAccessToken(timeoutMs?: number): Promise<string> {
  refreshPromise ??= requestRefresh(timeoutMs).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/**
 * Whether a failed refresh means the session is genuinely gone.
 *
 * Only the server rejecting the token (401/403) invalidates a session. A
 * timeout, an offline browser, or a restarting API produces no response at
 * all, and treating that as a logout throws away a session whose cookie is
 * still perfectly valid.
 */
export function isAuthRejection(error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return status === 401 || status === 403;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retried ||
      originalRequest.url?.includes("/admin/auth/")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`);
      return apiClient(originalRequest);
    } catch (refreshError) {
      // Only a rejected token ends the session. A network failure or a
      // restarting API leaves the refresh cookie valid, so the session is
      // kept and the next request gets to try again.
      if (isAuthRejection(refreshError)) {
        useAuthStore.getState().clearSession();
      }
      return Promise.reject(refreshError);
    }
  }
);
