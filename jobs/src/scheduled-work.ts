import { analysisRuns, type Database } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";
import { eq } from "drizzle-orm";

import { createConfiguredSources } from "./configured-sources.js";
import { acquireJobLease, releaseJobLease } from "./job-lease.js";
import {
  PostgresIngestionRepository,
  syncSourceDefinition,
} from "./postgres-ingestion-repository.js";
import {
  createLeaseOwner,
  executeConfiguredSource,
} from "./source-executor.js";
import { listSourceHealth } from "./source-health.js";
import {
  PostgresStoryProcessor,
  type StoryProcessingResult,
} from "./story-processing.js";
import {
  PostgresStoryAnalysisProcessor,
  type StoryAnalysisResult,
  type StoryAnalyzer,
} from "./story-analysis.js";

export interface DueSourceIngestionResult {
  configuredCount: number;
  dueCount: number;
  completedCount: number;
  skippedCount: number;
  failedCount: number;
}

export async function runDueSourceIngestion(input: {
  db: Database;
  logger: IngestionLogger;
}): Promise<DueSourceIngestionResult> {
  const repository = new PostgresIngestionRepository(input.db);
  const configuredSources = createConfiguredSources();
  const configuredBySlug = new Map(
    configuredSources.map((configured) => [
      configured.definition.key,
      configured,
    ]),
  );
  const leaseOwner = createLeaseOwner();
  const result: DueSourceIngestionResult = {
    configuredCount: configuredSources.length,
    dueCount: 0,
    completedCount: 0,
    skippedCount: 0,
    failedCount: 0,
  };

  for (const configured of configuredSources) {
    await syncSourceDefinition(input.db, configured.definition);
  }

  const dueSources = (await listSourceHealth(input.db)).filter(
    (source) => source.isDue && configuredBySlug.has(source.slug),
  );
  result.dueCount = dueSources.length;
  input.logger.info("Due source evaluation finished", {
    configuredCount: result.configuredCount,
    dueCount: result.dueCount,
  });

  for (const source of dueSources) {
    const configured = configuredBySlug.get(source.slug);
    if (!configured) continue;

    try {
      const execution = await executeConfiguredSource({
        db: input.db,
        source,
        configured,
        repository,
        logger: input.logger,
        leaseOwner,
      });
      if (execution.status === "skipped") {
        result.skippedCount += 1;
      } else if (execution.result.status === "failed") {
        result.failedCount += 1;
      } else {
        result.completedCount += 1;
      }
    } catch (error) {
      result.failedCount += 1;
      input.logger.error("Due source execution failed unexpectedly", {
        source: source.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export async function runStoryProcessing(input: {
  db: Database;
  logger: IngestionLogger;
  maxBatches?: number;
  batchSize?: number;
}): Promise<StoryProcessingResult & { acquired: boolean }> {
  const maxBatches = input.maxBatches ?? 10;
  const batchSize = input.batchSize ?? 100;
  const processor = new PostgresStoryProcessor(input.db, input.logger);
  const leaseOwner = createLeaseOwner();
  const leaseKey = "story-processing";
  const totals: StoryProcessingResult & { acquired: boolean } = {
    acquired: false,
    assessedCount: 0,
    relevantCount: 0,
    irrelevantCount: 0,
    storiesCreatedCount: 0,
    storiesMatchedCount: 0,
    skippedCount: 0,
    failedCount: 0,
  };

  totals.acquired = await acquireJobLease({
    db: input.db,
    key: leaseKey,
    owner: leaseOwner,
  });
  if (!totals.acquired) {
    input.logger.info(
      "Story processing skipped because another worker owns the lease",
    );
    return totals;
  }

  try {
    for (let batch = 0; batch < maxBatches; batch += 1) {
      const result = await processor.processBatch(batchSize);
      for (const key of Object.keys(result) as Array<
        keyof StoryProcessingResult
      >) {
        totals[key] += result[key];
      }
      if (result.assessedCount + result.skippedCount === 0) break;
      if (
        result.assessedCount + result.skippedCount + result.failedCount <
        batchSize
      ) {
        break;
      }
    }
    input.logger.info("Story processing finished", { ...totals });
    return totals;
  } finally {
    const released = await releaseJobLease({
      db: input.db,
      key: leaseKey,
      owner: leaseOwner,
    });
    if (!released) {
      input.logger.warn("Story processing lease was no longer owned");
    }
  }
}

export async function runStoryAnalysis(input: {
  db: Database;
  logger: IngestionLogger;
  analyzer: StoryAnalyzer | null;
  batchSize?: number;
  concurrency?: number;
}): Promise<
  StoryAnalysisResult & {
    acquired: boolean;
    configured: boolean;
    runId: string;
  }
> {
  const totals: StoryAnalysisResult & {
    acquired: boolean;
    configured: boolean;
    runId: string;
  } = {
    acquired: false,
    configured: input.analyzer !== null,
    runId: "",
    attemptedCount: 0,
    generatedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errorMessages: [],
  };
  const [run] = await input.db
    .insert(analysisRuns)
    .values({
      status: "running",
      configured: totals.configured,
      provider: input.analyzer?.provider ?? null,
      model: input.analyzer?.model ?? null,
    })
    .returning({ id: analysisRuns.id });
  if (!run) throw new Error("Story analysis run creation failed");
  totals.runId = run.id;

  const finishRun = async (status: string) => {
    await input.db
      .update(analysisRuns)
      .set({
        status,
        configured: totals.configured,
        acquired: totals.acquired,
        attemptedCount: totals.attemptedCount,
        generatedCount: totals.generatedCount,
        skippedCount: totals.skippedCount,
        failedCount: totals.failedCount,
        errorMessages: totals.errorMessages,
        finishedAt: new Date(),
      })
      .where(eq(analysisRuns.id, totals.runId));
  };

  if (!input.analyzer) {
    totals.errorMessages.push("AI Gateway credentials were unavailable");
    input.logger.warn(
      "Story analysis skipped because AI Gateway is unavailable",
    );
    await finishRun("skipped");
    return totals;
  }

  const leaseOwner = createLeaseOwner();
  const leaseKey = "story-analysis";
  totals.acquired = await acquireJobLease({
    db: input.db,
    key: leaseKey,
    owner: leaseOwner,
    durationMs: 10 * 60_000,
  });
  if (!totals.acquired) {
    totals.errorMessages.push("Another worker owned the Story analysis lease");
    input.logger.info(
      "Story analysis skipped because another worker owns the lease",
    );
    await finishRun("skipped");
    return totals;
  }

  try {
    const processor = new PostgresStoryAnalysisProcessor(
      input.db,
      input.logger,
      input.analyzer,
    );
    const result = await processor.processBatch(
      input.batchSize ?? 60,
      input.concurrency ?? 5,
    );
    Object.assign(totals, result);
    await finishRun(result.failedCount > 0 ? "partial" : "succeeded");
    input.logger.info("Story analysis finished", { ...totals });
    return totals;
  } catch (error) {
    totals.failedCount += 1;
    totals.errorMessages.push(
      error instanceof Error ? error.message.slice(0, 1_000) : String(error),
    );
    await finishRun("failed");
    throw error;
  } finally {
    const released = await releaseJobLease({
      db: input.db,
      key: leaseKey,
      owner: leaseOwner,
    });
    if (!released)
      input.logger.warn("Story analysis lease was no longer owned");
  }
}
