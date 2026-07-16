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
export { acquireJobLease, releaseJobLease } from "./job-lease.js";
export {
  PostgresStoryProcessor,
  type StoryProcessingResult,
} from "./story-processing.js";
export {
  runDueSourceIngestion,
  runStoryAnalysis,
  runStoryProcessing,
  type DueSourceIngestionResult,
} from "./scheduled-work.js";
export {
  createConfiguredStoryAnalyzer,
  DEFAULT_STORY_ANALYSIS_MODEL,
  PostgresStoryAnalysisProcessor,
  STORY_ANALYSIS_PROMPT_VERSION,
  VercelGatewayStoryAnalyzer,
  type GeneratedStoryAnalysis,
  type StoryAnalysisInput,
  type StoryAnalysisResult,
  type StoryAnalyzer,
} from "./story-analysis.js";
