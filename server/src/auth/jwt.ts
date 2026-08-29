import jwt from "jsonwebtoken";
import { env } from "@/config/env";

const ACCESS_TOKEN_TTL = "15m";

export type AccessTokenClaims =
  | { role: "admin"; adminId: string }
  /**
   * `sessionId` is null for a self-registered client the admin has not yet
   * attached to a shoot. Such a token authenticates the person but grants
   * access to no gallery.
   */
  | { role: "client"; clientId: string; sessionId: string | null };

export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenClaims;
}
