import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";
import {
  createOpenAiNewsAdapter,
  openAiNewsSource,
} from "@ai-news-navigator/sources";

import { runSourceJob } from "./index.js";
import {
  PostgresIngestionRepository,
  syncSourceDefinition,
} from "./postgres-ingestion-repository.js";

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

const { client, db } = createDatabase();

try {
  const source = await syncSourceDefinition(db, openAiNewsSource);
  const overlapSince = source.lastSuccessAt
    ? new Date(source.lastSuccessAt.getTime() - 24 * 60 * 60 * 1_000)
    : undefined;
  const result = await runSourceJob({
    sourceId: source.id,
    adapter: createOpenAiNewsAdapter(),
    repository: new PostgresIngestionRepository(db),
    logger,
    ...(overlapSince ? { since: overlapSince } : {}),
  });

  if (result.status === "failed") {
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
