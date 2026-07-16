import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";
import {
  createOpenAiNewsAdapter,
  openAiNewsSource,
} from "@ai-news-navigator/sources";

import {
  PostgresIngestionRepository,
  syncSourceDefinition,
} from "./postgres-ingestion-repository.js";
import {
  createLeaseOwner,
  executeConfiguredSource,
} from "./source-executor.js";

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

const { client, db } = createDatabase();

try {
  const configured = {
    definition: openAiNewsSource,
    adapter: createOpenAiNewsAdapter(),
  };
  const source = await syncSourceDefinition(db, configured.definition);
  const execution = await executeConfiguredSource({
    db,
    source,
    configured,
    repository: new PostgresIngestionRepository(db),
    logger,
    leaseOwner: createLeaseOwner(),
  });

  if (
    execution.status === "completed" &&
    execution.result.status === "failed"
  ) {
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
