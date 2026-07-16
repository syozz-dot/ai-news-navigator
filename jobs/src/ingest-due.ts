import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";

import { runDueSourceIngestion } from "./scheduled-work.js";

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

const { client, db } = createDatabase();

try {
  const result = await runDueSourceIngestion({ db, logger });
  if (result.failedCount > 0) process.exitCode = 1;
} finally {
  await client.end();
}
