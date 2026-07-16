import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";

import { createConfiguredSources } from "./configured-sources.js";
import {
  PostgresIngestionRepository,
  syncSourceDefinition,
} from "./postgres-ingestion-repository.js";
import {
  createLeaseOwner,
  executeConfiguredSource,
} from "./source-executor.js";
import { listSourceHealth } from "./source-health.js";

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

const { client, db } = createDatabase();
const repository = new PostgresIngestionRepository(db);
const configuredSources = createConfiguredSources();
const configuredBySlug = new Map(
  configuredSources.map((configured) => [
    configured.definition.key,
    configured,
  ]),
);
const leaseOwner = createLeaseOwner();
let failedSources = 0;

try {
  for (const configured of configuredSources) {
    await syncSourceDefinition(db, configured.definition);
  }

  const dueSources = (await listSourceHealth(db)).filter(
    (source) => source.isDue && configuredBySlug.has(source.slug),
  );
  logger.info("Due source evaluation finished", {
    configuredCount: configuredSources.length,
    dueCount: dueSources.length,
  });

  for (const source of dueSources) {
    const configured = configuredBySlug.get(source.slug);
    if (!configured) continue;

    try {
      const execution = await executeConfiguredSource({
        db,
        source,
        configured,
        repository,
        logger,
        leaseOwner,
      });
      if (
        execution.status === "completed" &&
        execution.result.status === "failed"
      ) {
        failedSources += 1;
      }
    } catch (error) {
      failedSources += 1;
      logger.error("Due source execution failed unexpectedly", {
        source: source.slug,
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
