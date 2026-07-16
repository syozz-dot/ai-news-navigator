import type { SourceAdapter } from "@ai-news-navigator/sources";
import {
  runIngestion,
  type IngestionLogger,
  type IngestionRepository,
  type SourceRunResult,
} from "@ai-news-navigator/pipeline";

export interface SourceJobDependencies {
  sourceId: string;
  adapter: SourceAdapter;
  repository: IngestionRepository;
  logger: IngestionLogger;
  since?: Date;
}

export async function runSourceJob(
  dependencies: SourceJobDependencies,
): Promise<SourceRunResult> {
  return runIngestion(dependencies);
}

export {
  PostgresIngestionRepository,
  syncSourceDefinition,
  type SyncedSource,
} from "./postgres-ingestion-repository.js";
export {
  evaluateSourceHealth,
  listSourceHealth,
  type SourceHealth,
  type SourceHealthInput,
  type SourceOperationalState,
} from "./source-health.js";
export { acquireSourceLease, releaseSourceLease } from "./source-lease.js";
