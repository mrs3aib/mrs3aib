import { apiClient } from "./apiClient";
import type { AdminUser, LoginResponse, RefreshResponse } from "@/types/auth";

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>("/admin/auth/login", payload);
  return data;
}

export async function refresh(): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>("/admin/auth/refresh");
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/admin/auth/logout");
}

export async function updateProfile(payload: {
  name: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
}): Promise<AdminUser> {
  const { data } = await apiClient.patch<{ admin: AdminUser }>("/admin/auth/profile", payload);
  return data.admin;
}
