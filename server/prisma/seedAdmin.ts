import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/auth/password";

/**
 * Create (or update) the single studio admin.
 *
 * Separate from `seed.ts`, which fills a development database with demo
 * sessions, clients and media. Those rows have no place in a production
 * deployment, so this seeds the one account needed to sign in and nothing
 * else.
 *
 * Credentials come from the environment rather than the file: this is
 * committed, and a password in the repository is a password in every clone
 * and in the git history for good.
 *
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run prisma:seed:admin
 */
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Yahya Al-Saib";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.\n" +
        "  Example: SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='...' npm run prisma:seed:admin"
    );
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

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

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
