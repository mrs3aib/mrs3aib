-- Removes the OTP table.
--
-- Client login by WhatsApp OTP has been dropped: the provider, routes, and
-- services that used this table no longer exist. The table held only
-- short-lived verification codes (minutes), so nothing of lasting value is
-- discarded.
--
-- `IF EXISTS` keeps the migration replayable against a database where a
-- previous attempt already removed it.
DROP TABLE IF EXISTS "otps";
