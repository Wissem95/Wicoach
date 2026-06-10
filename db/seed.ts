/**
 * Seed runner: executes db/seed.sql against DATABASE_URL.
 *
 *   npm run db:seed                      # uses the email baked into seed.sql
 *   npm run db:seed -- you@example.com   # override the lookup email
 *
 * PREREQUISITE: sign up in the app first so the auth user exists.
 */
import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in .env.local");

  const overrideEmail = process.argv[2];
  let sqlText = readFileSync(join(process.cwd(), "db", "seed.sql"), "utf8");

  if (overrideEmail) {
    sqlText = sqlText.replace(
      /where email = '[^']*'/,
      `where email = '${overrideEmail.replace(/'/g, "''")}'`,
    );
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await sql.unsafe(sqlText);
    console.log("✓ Seed complete.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
