import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";

import { createConfiguredStoryAnalyzer } from "./story-analysis.js";
import { runStoryAnalysis } from "./scheduled-work.js";

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

const analyzer = createConfiguredStoryAnalyzer();
if (!analyzer) {
  throw new Error(
    "AI Gateway credentials are required locally. Set AI_GATEWAY_API_KEY or refresh VERCEL_OIDC_TOKEN.",
  );
}

const { client, db } = createDatabase();

try {
  const result = await runStoryAnalysis({ db, logger, analyzer });
  if (result.failedCount > 0) process.exitCode = 1;
} finally {
  await client.end();
}
