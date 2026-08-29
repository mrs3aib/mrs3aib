import { adminRepository } from "@/repositories/adminRepository";
import { refreshTokenRepository } from "@/repositories/refreshTokenRepository";
import { hashPassword, verifyPassword } from "@/auth/password";
import { signAccessToken } from "@/auth/jwt";
import {
  generateRefreshToken,
  hashRefreshToken,
  ADMIN_REFRESH_TOKEN_TTL_MS
} from "@/auth/refreshToken";
import { UnauthorizedError } from "@/types/errors";
import { logger } from "@/config/logger";

type TokenPair = { accessToken: string; refreshToken: string };

async function issueTokenPair(adminId: string): Promise<TokenPair> {
  const accessToken = signAccessToken({ role: "admin", adminId });
  const refreshToken = generateRefreshToken();

  await refreshTokenRepository.create({
    tokenHash: hashRefreshToken(refreshToken),
    adminId,
    expiresAt: new Date(Date.now() + ADMIN_REFRESH_TOKEN_TTL_MS)
  });

  return { accessToken, refreshToken };
}

export const adminAuthService = {
  async updateProfile(
    adminId: string,
    input: { name: string; email: string; currentPassword: string; newPassword?: string }
  ) {
    const admin = await adminRepository.findById(adminId);
    if (!admin || !(await verifyPassword(input.currentPassword, admin.passwordHash))) {
      throw new UnauthorizedError("Incorrect current password");
    }

    const updated = await adminRepository.update(adminId, {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      ...(input.newPassword ? { passwordHash: await hashPassword(input.newPassword) } : {})
    });
    return { id: updated.id, name: updated.name, email: updated.email };
  },

  async login(email: string, password: string) {
    const admin = await adminRepository.findByEmail(email);
    if (!admin) {
      throw new UnauthorizedError("Incorrect email or password");
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      logger.warn({ email }, "Failed admin login attempt");
      throw new UnauthorizedError("Incorrect email or password");
    }

    const tokens = await issueTokenPair(admin.id);
    logger.info({ adminId: admin.id }, "Admin logged in");

    return {
      ...tokens,
      admin: { id: admin.id, email: admin.email, name: admin.name }
    };
  },

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await refreshTokenRepository.findByHash(tokenHash);

    if (
      !stored ||
      !stored.adminId ||
      stored.revokedAt ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Rotate: revoke the used token and issue a fresh pair, so a replayed
    // (stolen) token can only ever be used once.
    await refreshTokenRepository.revoke(stored.id);
    return issueTokenPair(stored.adminId);
  },

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await refreshTokenRepository.findByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await refreshTokenRepository.revoke(stored.id);
    }
  }
};
