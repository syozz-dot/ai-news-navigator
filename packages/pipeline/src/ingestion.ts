import type { SourceAdapter } from "@ai-news-navigator/sources";

import { normalizeItem, type NormalizedItem } from "./normalize.js";

export type SourceRunStatus = "succeeded" | "partial" | "failed";

export interface SourceRunResult {
  status: SourceRunStatus;
  fetchedCount: number;
  storedCount: number;
  duplicateCount: number;
  failedCount: number;
  errorMessage: string | null;
}

export interface IngestionRepository {
  startSourceRun(input: { sourceId: string; startedAt: Date }): Promise<string>;
  upsertItem(item: NormalizedItem): Promise<{ id: string; created: boolean }>;
  finishSourceRun(
    runId: string,
    result: SourceRunResult & { finishedAt: Date },
  ): Promise<void>;
}

export interface IngestionLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface RunIngestionInput {
  sourceId: string;
  adapter: SourceAdapter;
  repository: IngestionRepository;
  logger: IngestionLogger;
  now?: () => Date;
  since?: Date;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runIngestion(
  input: RunIngestionInput,
): Promise<SourceRunResult> {
  const clock = input.now ?? (() => new Date());
  const startedAt = clock();
  const runId = await input.repository.startSourceRun({
    sourceId: input.sourceId,
    startedAt,
  });

  input.logger.info("Source ingestion started", {
    sourceId: input.sourceId,
    adapter: input.adapter.key,
    runId,
  });

  try {
    const fetchContext = input.since
      ? { now: startedAt, since: input.since }
      : { now: startedAt };
    const rawItems = await input.adapter.fetch(fetchContext);
    const seenCanonicalUrls = new Set<string>();

    let storedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (const raw of rawItems) {
      try {
        const normalized = normalizeItem({
          sourceId: input.sourceId,
          raw,
          fetchedAt: startedAt,
        });

        if (seenCanonicalUrls.has(normalized.canonicalUrlHash)) {
          duplicateCount += 1;
          continue;
        }
        seenCanonicalUrls.add(normalized.canonicalUrlHash);

        const stored = await input.repository.upsertItem(normalized);
        if (stored.created) {
          storedCount += 1;
        } else {
          duplicateCount += 1;
        }
      } catch (error) {
        failedCount += 1;
        input.logger.warn("Source item could not be normalized or stored", {
          sourceId: input.sourceId,
          error: errorMessage(error),
        });
      }
    }

    const result: SourceRunResult = {
      status: failedCount === 0 ? "succeeded" : "partial",
      fetchedCount: rawItems.length,
      storedCount,
      duplicateCount,
      failedCount,
      errorMessage: null,
    };

    await input.repository.finishSourceRun(runId, {
      ...result,
      finishedAt: clock(),
    });
    input.logger.info("Source ingestion finished", { runId, ...result });
    return result;
  } catch (error) {
    const message = errorMessage(error);
    const result: SourceRunResult = {
      status: "failed",
      fetchedCount: 0,
      storedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      errorMessage: message,
    };

    await input.repository.finishSourceRun(runId, {
      ...result,
      finishedAt: clock(),
    });
    input.logger.error("Source ingestion failed", {
      sourceId: input.sourceId,
      runId,
      error: message,
    });
    return result;
  }
}
