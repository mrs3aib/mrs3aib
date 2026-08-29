import type { Request, Response } from "express";
import { adminAuthService } from "@/services/adminAuthService";
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from "@/utils/refreshCookie";
import { UnauthorizedError } from "@/types/errors";

export const adminAuthController = {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };
    const { accessToken, refreshToken, admin } = await adminAuthService.login(
      email,
      password
    );
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken, admin });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = readRefreshCookie(req.cookies as Record<string, string>);
    if (!refreshToken) {
      throw new UnauthorizedError("Missing refresh token");
    }

    const tokens = await adminAuthService.refresh(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json({ accessToken: tokens.accessToken });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = readRefreshCookie(req.cookies as Record<string, string>);
    if (refreshToken) {
      await adminAuthService.logout(refreshToken);
    }
    clearRefreshCookie(res);
    res.status(204).send();
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const adminId = req.auth?.role === "admin" ? req.auth.adminId : "";
    const admin = await adminAuthService.updateProfile(adminId, req.body);
    res.status(200).json({ admin });
  }
};
