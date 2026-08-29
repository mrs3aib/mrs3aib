-- Client login moves from WhatsApp OTP to phone + password.
--
-- The phone number keeps its role as the unique login identifier; what changes
-- is the proof of ownership — a stored bcrypt hash instead of a one-time code
-- delivered over WhatsApp. That removes the Meta Cloud API dependency, and
-- with it the OTP table, which held nothing but codes that expired in minutes.

-- Nullable rather than NOT NULL: existing clients were created under the OTP
-- flow and have no password. A row without a hash simply cannot sign in until
-- an admin sets one, which is preferable to inventing a placeholder hash that
-- would look like a working credential.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- Self-registration creates an account before the admin has a session to
-- attach it to, so the link becomes optional. Existing rows all have a value,
-- so no backfill is needed.
ALTER TABLE "clients" ALTER COLUMN "sessionId" DROP NOT NULL;

-- Tracks password changes. Defaulted for existing rows so the column can be
-- NOT NULL without a separate backfill pass.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- The OTP flow is gone: provider, routes, repository, and env credentials have
-- all been removed. Only short-lived verification codes lived here.
DROP TABLE IF EXISTS "otps";
