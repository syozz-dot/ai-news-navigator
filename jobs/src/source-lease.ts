import { sources, type Database } from "@ai-news-navigator/database";
import { and, eq, isNull, lte, ne, or } from "drizzle-orm";

const DEFAULT_LEASE_DURATION_MS = 15 * 60_000;

export async function acquireSourceLease(input: {
  db: Database;
  sourceId: string;
  owner: string;
  now?: Date;
  durationMs?: number;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const durationMs = input.durationMs ?? DEFAULT_LEASE_DURATION_MS;
  if (!input.owner.trim() || input.owner.length > 128) {
    throw new Error("Source lease owner must be between 1 and 128 characters");
  }
  if (!Number.isFinite(durationMs) || durationMs < 1) {
    throw new Error("Source lease duration must be positive");
  }

  const [leased] = await input.db
    .update(sources)
    .set({
      leaseOwner: input.owner,
      leaseExpiresAt: new Date(now.getTime() + durationMs),
      updatedAt: now,
    })
    .where(
      and(
        eq(sources.id, input.sourceId),
        ne(sources.status, "disabled"),
        or(isNull(sources.leaseExpiresAt), lte(sources.leaseExpiresAt, now)),
      ),
    )
    .returning({ id: sources.id });

  return Boolean(leased);
}

export async function releaseSourceLease(input: {
  db: Database;
  sourceId: string;
  owner: string;
  now?: Date;
}): Promise<boolean> {
  const [released] = await input.db
    .update(sources)
    .set({
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: input.now ?? new Date(),
    })
    .where(
      and(eq(sources.id, input.sourceId), eq(sources.leaseOwner, input.owner)),
    )
    .returning({ id: sources.id });

  return Boolean(released);
}
