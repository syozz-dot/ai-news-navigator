import { sources, type Database } from "@ai-news-navigator/database";
import { asc } from "drizzle-orm";

export type SourceOperationalState =
  "healthy" | "degraded" | "failing" | "stale" | "never_run" | "disabled";

export interface SourceHealthInput {
  id: string;
  slug: string;
  name: string;
  status: "active" | "degraded" | "disabled";
  fetchIntervalMinutes: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
}

export interface SourceHealth extends SourceHealthInput {
  operationalState: SourceOperationalState;
  isDue: boolean;
  isLeased: boolean;
  lastAttemptAt: Date | null;
  nextRunAt: Date | null;
  retryDelayMinutes: number;
}

function latestDate(left: Date | null, right: Date | null): Date | null {
  if (!left) return right;
  if (!right) return left;
  return left.getTime() >= right.getTime() ? left : right;
}

export function evaluateSourceHealth(
  input: SourceHealthInput,
  now = new Date(),
): SourceHealth {
  const lastAttemptAt = latestDate(input.lastSuccessAt, input.lastFailureAt);
  const failureExponent = Math.min(
    Math.max(input.consecutiveFailures - 1, 0),
    5,
  );
  const retryDelayMinutes = Math.min(
    input.fetchIntervalMinutes * 2 ** failureExponent,
    24 * 60,
  );
  const nextRunAt = lastAttemptAt
    ? new Date(lastAttemptAt.getTime() + retryDelayMinutes * 60_000)
    : null;
  const isLeased = Boolean(
    input.leaseExpiresAt && input.leaseExpiresAt.getTime() > now.getTime(),
  );
  const isDue =
    input.status !== "disabled" &&
    !isLeased &&
    (!nextRunAt || nextRunAt.getTime() <= now.getTime());

  let operationalState: SourceOperationalState;
  if (input.status === "disabled") {
    operationalState = "disabled";
  } else if (input.consecutiveFailures > 0) {
    operationalState = "failing";
  } else if (!input.lastSuccessAt) {
    operationalState = input.lastFailureAt ? "failing" : "never_run";
  } else if (
    now.getTime() - input.lastSuccessAt.getTime() >
    input.fetchIntervalMinutes * 2 * 60_000
  ) {
    operationalState = "stale";
  } else if (input.status === "degraded") {
    operationalState = "degraded";
  } else {
    operationalState = "healthy";
  }

  return {
    ...input,
    operationalState,
    isDue,
    isLeased,
    lastAttemptAt,
    nextRunAt: input.status === "disabled" ? null : nextRunAt,
    retryDelayMinutes,
  };
}

export async function listSourceHealth(
  db: Database,
  now = new Date(),
): Promise<SourceHealth[]> {
  const rows = await db
    .select({
      id: sources.id,
      slug: sources.slug,
      name: sources.name,
      status: sources.status,
      fetchIntervalMinutes: sources.fetchIntervalMinutes,
      lastSuccessAt: sources.lastSuccessAt,
      lastFailureAt: sources.lastFailureAt,
      consecutiveFailures: sources.consecutiveFailures,
      leaseOwner: sources.leaseOwner,
      leaseExpiresAt: sources.leaseExpiresAt,
    })
    .from(sources)
    .orderBy(asc(sources.name));

  return rows.map((row) => evaluateSourceHealth(row, now));
}
