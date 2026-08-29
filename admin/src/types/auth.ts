export type AdminUser = {
  id: string;
  email: string;
  name: string;
};

// The refresh token is never sent to client JS — the server sets it as an
// httpOnly, Secure, SameSite cookie, and the browser attaches it automatically
// on requests to the auth endpoints (see services/apiClient.ts, withCredentials: true).

export type LoginResponse = {
  accessToken: string;
  admin: AdminUser;
};

export type RefreshResponse = {
  accessToken: string;
};
