import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password";

/**
 * Create (or update) the studio's admin accounts.
 *
 * Separate from `seed.ts`, which fills a development database with demo
 * sessions, clients and media. Those rows have no place in a production
 * deployment, so this seeds only the accounts needed to sign in.
 *
 * Credentials come from the environment rather than the file: this is
 * committed, and a password in the repository is a password in every clone
 * and in the git history for good.
 *
 * Two forms are accepted. One admin, as before:
 *
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run prisma:seed:admin
 *
 * Or several at once, as a JSON array. JSON rather than a delimited string
 * because passwords contain punctuation freely — any separator character is
 * also a character someone's password may legitimately hold, and guessing
 * where a field ends corrupts the password silently:
 *
 *   SEED_ADMINS='[{"email":"a@x.com","password":"...","name":"A"}]'
 *
 * Both are read from `server/.env` too, which is git-ignored, so the values
 * need not be retyped on every run.
 */
const prisma = new PrismaClient();

type AdminSeed = { email: string; password: string; name: string };

const DEFAULT_NAME = "Yahya Al-Saib";

const USAGE =
  "  One admin:  SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='...' npm run prisma:seed:admin\n" +
  '  Several:    SEED_ADMINS=\'[{"email":"a@x.com","password":"..."}]\' npm run prisma:seed:admin\n' +
  "  Either may live in server/.env instead of the command line.";

function parseMany(raw: string): AdminSeed[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`SEED_ADMINS is not valid JSON.\n${USAGE}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`SEED_ADMINS must be a non-empty JSON array.\n${USAGE}`);
  }

  return parsed.map((item, index) => {
    const position = `SEED_ADMINS entry ${index + 1}`;
    if (typeof item !== "object" || item === null) {
      throw new Error(`${position} is not an object.`);
    }
    const { email, password, name } = item as Record<string, unknown>;
    if (typeof email !== "string" || !email.trim()) {
      throw new Error(`${position} has no email.`);
    }
    if (typeof password !== "string" || !password) {
      throw new Error(`${position} (${email}) has no password.`);
    }
    if (name !== undefined && typeof name !== "string") {
      throw new Error(`${position} (${email}) has a non-string name.`);
    }
    return {
      email: email.trim().toLowerCase(),
      password,
      name: name?.trim() || DEFAULT_NAME
    };
  });
}

function readSeeds(): AdminSeed[] {
  const many = process.env.SEED_ADMINS?.trim();
  if (many) {
    return parseMany(many);
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || DEFAULT_NAME;

  if (!email || !password) {
    throw new Error(`No admin credentials found.\n${USAGE}`);
  }

  return [{ email, password, name }];
}

async function main() {
  const seeds = readSeeds();

  for (const seed of seeds) {
    if (!seed.email.includes("@")) {
      throw new Error(`"${seed.email}" is not an email address.`);
    }
    if (seed.password.length < 8) {
      throw new Error(`Password for ${seed.email} must be at least 8 characters.`);
    }
  }

  const duplicate = seeds.find(
    (seed, index) => seeds.findIndex((other) => other.email === seed.email) !== index
  );
  if (duplicate) {
    throw new Error(`${duplicate.email} is listed twice.`);
  }

  for (const { email, password, name } of seeds) {
    // Hashed through the app's own helper so the cost factor cannot drift from
    // what the login path verifies against.
    const passwordHash = await hashPassword(password);

    const admin = await prisma.admin.upsert({
      where: { email },
      // Re-running resets the password, which is also how a lockout is fixed.
      update: { passwordHash, name },
      create: { email, passwordHash, name }
    });

    console.log(`Admin ready: ${admin.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
