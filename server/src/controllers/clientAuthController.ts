import type { Request, Response } from "express";
import { clientAuthService } from "@/services/clientAuthService";
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from "@/utils/refreshCookie";
import { UnauthorizedError } from "@/types/errors";

export const clientAuthController = {
  async register(req: Request, res: Response): Promise<void> {
    const { name, phone, password } = req.body as {
      name: string;
      phone: string;
      password: string;
    };
    const { accessToken, refreshToken, client } = await clientAuthService.register({
      name,
      phone,
      password
    });
    // Signed in immediately: making someone register and then type the same
    // credentials again adds a step without adding any check.
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ accessToken, client });
  },

  async login(req: Request, res: Response): Promise<void> {
    const { phone, password } = req.body as { phone: string; password: string };
    const { accessToken, refreshToken, client } = await clientAuthService.login(
      phone,
      password
    );
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken, client });
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") {
      throw new UnauthorizedError("Client access required");
    }
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    await clientAuthService.changePassword(req.auth.clientId, currentPassword, newPassword);

    /**
     * Changing the password revoked every refresh token for this client,
     * including the one in this browser's cookie. Clearing it here keeps the
     * browser from holding a cookie the server will now reject, which would
     * otherwise surface as a confusing failed refresh on the next page load.
     */
    clearRefreshCookie(res);
    res.status(204).send();
  },

  async me(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") {
      throw new UnauthorizedError("Client access required");
    }
    const client = await clientAuthService.me(req.auth.clientId);
    res.status(200).json({ client });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = readRefreshCookie(req.cookies as Record<string, string>);
    if (!refreshToken) {
      throw new UnauthorizedError("Missing refresh token");
    }

    const tokens = await clientAuthService.refresh(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json({ accessToken: tokens.accessToken });
  },

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = readRefreshCookie(req.cookies as Record<string, string>);
    if (refreshToken) {
      await clientAuthService.logout(refreshToken);
    }
    clearRefreshCookie(res);
    res.status(204).send();
  }
};
