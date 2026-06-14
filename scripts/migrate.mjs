/**
 * Runs every numbered SQL migration in db/migrations (in order) against
 * DATABASE_URL. All migrations are idempotent, so re-running is safe.
 *
 *   DATABASE_URL=postgres://... node scripts/migrate.mjs
 *   (or put DATABASE_URL in .env.local and run: npm run db:migrate)
 */
import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const dir = join(process.cwd(), "db", "migrations");
const files = readdirSync(dir)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

const sql = postgres(url, { prepare: false, max: 1, ssl: "require" });

try {
  for (const f of files) {
    process.stdout.write(`→ ${f} … `);
    await sql.unsafe(readFileSync(join(dir, f), "utf8"));
    console.log("ok");
  }
  console.log("✓ All migrations applied.");
} catch (err) {
  console.error("\n✗ Migration failed:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
