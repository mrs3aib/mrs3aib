-- Recreates the OTP table.
--
-- Client login by phone was removed in 20260825000000_remove_otp_client_auth
-- together with the WhatsApp credentials that had been *required* at startup,
-- so the server could not boot without them. Those credentials are optional
-- now, which means the login flow can come back without holding the rest of
-- the API hostage to a WhatsApp account.
--
-- `IF NOT EXISTS` keeps this replayable, and safe on a database where the
-- drop never ran.
CREATE TABLE IF NOT EXISTS "otps" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "otps_phone_idx" ON "otps"("phone");
