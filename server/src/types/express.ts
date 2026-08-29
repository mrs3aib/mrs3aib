import type { AccessTokenClaims } from "@/auth/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by Express's own type-augmentation pattern
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims;
    }
  }
}

export {};
