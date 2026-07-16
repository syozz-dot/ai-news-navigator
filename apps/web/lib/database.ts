import { createDatabase } from "@ai-news-navigator/database";

let connection: ReturnType<typeof createDatabase> | undefined;

export function getDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Add it to the runtime environment before opening the news feed.",
    );
  }

  connection ??= createDatabase(process.env.DATABASE_URL);
  return connection;
}
