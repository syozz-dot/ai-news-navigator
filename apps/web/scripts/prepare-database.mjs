import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping database migration outside Vercel production.");
  process.exit(0);
}

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL or DATABASE_URL_UNPOOLED is required for a production deployment.",
  );
}

const webDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(webDirectory, "../../..");
const migration = spawnSync("pnpm", ["db:migrate"], {
  cwd: repositoryRoot,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
  },
  stdio: "inherit",
});

if (migration.error) throw migration.error;
if (migration.status !== 0) {
  throw new Error(`Database migration failed with status ${migration.status}`);
}
