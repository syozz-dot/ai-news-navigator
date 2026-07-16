import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";

import { createConfiguredSources } from "./configured-sources.js";
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
const repository = new PostgresIngestionRepository(db);
let failedSources = 0;

try {
  for (const configured of createConfiguredSources()) {
    try {
      const source = await syncSourceDefinition(db, configured.definition);
      const overlapSince = source.lastSuccessAt
        ? new Date(source.lastSuccessAt.getTime() - 24 * 60 * 60 * 1_000)
        : undefined;
      const result = await runSourceJob({
        sourceId: source.id,
        adapter: configured.adapter,
        repository,
        logger,
        ...(overlapSince ? { since: overlapSince } : {}),
      });
      if (result.status === "failed") {
        failedSources += 1;
      }
    } catch (error) {
      failedSources += 1;
      logger.error("Configured source could not be started", {
        source: configured.definition.key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (failedSources > 0) {
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
