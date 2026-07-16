import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";

import { createConfiguredSources } from "./configured-sources.js";
import { syncSourceDefinition } from "./postgres-ingestion-repository.js";
import { listSourceHealth } from "./source-health.js";

const { client, db } = createDatabase();

try {
  for (const configured of createConfiguredSources()) {
    await syncSourceDefinition(db, configured.definition);
  }

  const health = await listSourceHealth(db);
  console.log(
    JSON.stringify(
      health.map((source) => ({
        slug: source.slug,
        name: source.name,
        state: source.operationalState,
        isDue: source.isDue,
        isLeased: source.isLeased,
        consecutiveFailures: source.consecutiveFailures,
        lastSuccessAt: source.lastSuccessAt,
        lastFailureAt: source.lastFailureAt,
        nextRunAt: source.nextRunAt,
      })),
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
