import { randomUUID } from "node:crypto";
import { hostname } from "node:os";

import type { Database } from "@ai-news-navigator/database";
import {
  runIngestion,
  type IngestionLogger,
  type IngestionRepository,
  type SourceRunResult,
} from "@ai-news-navigator/pipeline";

import type { ConfiguredSource } from "./configured-sources.js";
import { acquireSourceLease, releaseSourceLease } from "./source-lease.js";

export interface ExecutableSource {
  id: string;
  lastSuccessAt: Date | null;
}

export type SourceExecutionResult =
  | { status: "skipped"; reason: "leased" }
  | { status: "completed"; result: SourceRunResult };

export function createLeaseOwner(): string {
  return `${hostname()}:${process.pid}:${randomUUID()}`.slice(0, 128);
}

export async function executeConfiguredSource(input: {
  db: Database;
  source: ExecutableSource;
  configured: ConfiguredSource;
  repository: IngestionRepository;
  logger: IngestionLogger;
  leaseOwner: string;
  now?: Date;
}): Promise<SourceExecutionResult> {
  const now = input.now ?? new Date();
  const acquired = await acquireSourceLease({
    db: input.db,
    sourceId: input.source.id,
    owner: input.leaseOwner,
    now,
  });
  if (!acquired) {
    input.logger.info("Source ingestion skipped because a lease is active", {
      source: input.configured.definition.key,
    });
    return { status: "skipped", reason: "leased" };
  }

  try {
    const overlapSince = input.source.lastSuccessAt
      ? new Date(input.source.lastSuccessAt.getTime() - 24 * 60 * 60 * 1_000)
      : undefined;
    const result = await runIngestion({
      sourceId: input.source.id,
      adapter: input.configured.adapter,
      repository: input.repository,
      logger: input.logger,
      ...(overlapSince ? { since: overlapSince } : {}),
    });
    return { status: "completed", result };
  } finally {
    const released = await releaseSourceLease({
      db: input.db,
      sourceId: input.source.id,
      owner: input.leaseOwner,
    });
    if (!released) {
      input.logger.warn(
        "Source lease was not owned when release was attempted",
        {
          source: input.configured.definition.key,
        },
      );
    }
  }
}
