import { prisma } from "@/config/prisma";
import type { RefreshToken } from "@prisma/client";

export const refreshTokenRepository = {
  create(data: {
    tokenHash: string;
    adminId?: string;
    clientId?: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  },

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revoke(id: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() }
    });
  },

  revokeAllForAdmin(adminId: string): Promise<{ count: number }> {
    return prisma.refreshToken.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  },

  revokeAllForClient(clientId: string): Promise<{ count: number }> {
    return prisma.refreshToken.updateMany({
      where: { clientId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
};
