import { create } from "zustand";
import type { AdminUser } from "@/types/auth";

type AuthState = {
  accessToken: string | null;
  admin: AdminUser | null;
  status: "idle" | "authenticated" | "unauthenticated";
  setSession: (accessToken: string, admin: AdminUser) => void;
  setAccessToken: (accessToken: string) => void;
  setAdmin: (admin: AdminUser) => void;
  clearSession: () => void;
};

// Deliberately not persisted (no localStorage/sessionStorage middleware) —
// the access token must only ever live in memory, per the auth spec.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  admin: null,
  status: "idle",
  setSession: (accessToken, admin) =>
    set({ accessToken, admin, status: "authenticated" }),
  setAccessToken: (accessToken) => set({ accessToken, status: "authenticated" }),
  setAdmin: (admin) => set({ admin }),
  clearSession: () => set({ accessToken: null, admin: null, status: "unauthenticated" })
}));
