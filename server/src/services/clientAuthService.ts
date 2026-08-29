import { clientRepository } from "@/repositories/clientRepository";
import { refreshTokenRepository } from "@/repositories/refreshTokenRepository";
import { signAccessToken } from "@/auth/jwt";
import { hashPassword, verifyPassword } from "@/auth/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  CLIENT_REFRESH_TOKEN_TTL_MS
} from "@/auth/refreshToken";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/types/errors";
import { logger } from "@/config/logger";
import type { Client } from "@prisma/client";

type TokenPair = { accessToken: string; refreshToken: string };

export type ClientProfile = {
  id: string;
  name: string;
  phone: string;
  sessionId: string | null;
};

function toProfile(client: Client): ClientProfile {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    sessionId: client.sessionId
  };
}

async function issueTokenPair(
  clientId: string,
  sessionId: string | null
): Promise<TokenPair> {
  const accessToken = signAccessToken({ role: "client", clientId, sessionId });
  const refreshToken = generateRefreshToken();

  await refreshTokenRepository.create({
    tokenHash: hashRefreshToken(refreshToken),
    clientId,
    expiresAt: new Date(Date.now() + CLIENT_REFRESH_TOKEN_TTL_MS)
  });

  return { accessToken, refreshToken };
}

export const clientAuthService = {
  /**
   * Create an account from the public site.
   *
   * No session is attached: a visitor registering here has not been linked to
   * a shoot yet, and only an admin can make that link. The account is real and
   * can sign in — it just has no gallery to show until then.
   */
  async register(input: { name: string; phone: string; password: string }) {
    const existing = await clientRepository.findByPhone(input.phone);
    if (existing) {
      // Deliberately explicit. A vague error here would leave someone who
      // already has an account guessing why registration keeps failing, and
      // the phone number is something the person in front of the form already
      // knows — unlike a password reset, nothing is disclosed by saying so.
      throw new ConflictError("An account already exists for this phone number");
    }

    const client = await clientRepository.create({
      name: input.name,
      phone: input.phone,
      passwordHash: await hashPassword(input.password)
    });

    const tokens = await issueTokenPair(client.id, client.sessionId);
    logger.info({ clientId: client.id }, "Client registered");

    return { ...tokens, client: toProfile(client) };
  },

  async login(phone: string, password: string) {
    const client = await clientRepository.findByPhone(phone);

    /**
     * A client created by an admin before passwords existed — or one whose
     * password an admin has not set yet — has no hash to compare against.
     * That is answered with the same message as a wrong password, so the
     * endpoint cannot be used to sort registered numbers from unregistered
     * ones.
     */
    if (!client?.passwordHash) {
      logger.warn({ phone }, "Client login attempt for unknown or password-less account");
      throw new UnauthorizedError("Incorrect phone number or password");
    }

    const valid = await verifyPassword(password, client.passwordHash);
    if (!valid) {
      logger.warn({ clientId: client.id }, "Failed client login attempt");
      throw new UnauthorizedError("Incorrect phone number or password");
    }

    const tokens = await issueTokenPair(client.id, client.sessionId);
    logger.info({ clientId: client.id }, "Client logged in");

    return { ...tokens, client: toProfile(client) };
  },

  /** Change one's own password, proving ownership with the current one. */
  async changePassword(
    clientId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const client = await clientRepository.findById(clientId);
    if (!client?.passwordHash) {
      throw new UnauthorizedError("Incorrect current password");
    }

    const valid = await verifyPassword(currentPassword, client.passwordHash);
    if (!valid) {
      logger.warn({ clientId }, "Failed password change: wrong current password");
      throw new UnauthorizedError("Incorrect current password");
    }

    await clientRepository.update(clientId, {
      passwordHash: await hashPassword(newPassword)
    });

    /**
     * Every other session is signed out. Changing a password is the one action
     * someone takes when they suspect another person has it, so leaving old
     * refresh tokens alive would defeat the point.
     */
    await refreshTokenRepository.revokeAllForClient(clientId);
    logger.info({ clientId }, "Client password changed");
  },

  async me(clientId: string): Promise<ClientProfile> {
    const client = await clientRepository.findById(clientId);
    if (!client) throw new NotFoundError("Client no longer exists");
    return toProfile(client);
  },

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await refreshTokenRepository.findByHash(tokenHash);

    if (
      !stored ||
      !stored.clientId ||
      stored.revokedAt ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const client = await clientRepository.findById(stored.clientId);
    if (!client) {
      throw new NotFoundError("Client no longer exists");
    }

    // Rotate: revoke the used token and issue a fresh pair, so a replayed
    // (stolen) token can only ever be used once.
    await refreshTokenRepository.revoke(stored.id);

    /**
     * The session is read from the client row rather than carried over from
     * the old token, so an admin attaching a gallery to a self-registered
     * account takes effect on the next refresh instead of requiring the client
     * to sign out and back in.
     */
    return issueTokenPair(client.id, client.sessionId);
  },

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await refreshTokenRepository.findByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await refreshTokenRepository.revoke(stored.id);
    }
  }
};
