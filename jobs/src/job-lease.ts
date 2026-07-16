import { jobLeases, type Database } from "@ai-news-navigator/database";
import { and, eq, lte } from "drizzle-orm";

export async function acquireJobLease(input: {
  db: Database;
  key: string;
  owner: string;
  now?: Date;
  durationMs?: number;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const durationMs = input.durationMs ?? 30 * 60_000;
  if (!input.key.trim() || input.key.length > 128) {
    throw new Error("Job lease key must be between 1 and 128 characters");
  }
  if (!input.owner.trim() || input.owner.length > 128) {
    throw new Error("Job lease owner must be between 1 and 128 characters");
  }
  if (!Number.isFinite(durationMs) || durationMs < 1) {
    throw new Error("Job lease duration must be positive");
  }

  const leaseExpiresAt = new Date(now.getTime() + durationMs);
  const [updated] = await input.db
    .update(jobLeases)
    .set({ owner: input.owner, leaseExpiresAt, updatedAt: now })
    .where(
      and(eq(jobLeases.key, input.key), lte(jobLeases.leaseExpiresAt, now)),
    )
    .returning({ key: jobLeases.key });
  if (updated) return true;

  const [inserted] = await input.db
    .insert(jobLeases)
    .values({
      key: input.key,
      owner: input.owner,
      leaseExpiresAt,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning({ key: jobLeases.key });
  return Boolean(inserted);
}

export async function releaseJobLease(input: {
  db: Database;
  key: string;
  owner: string;
}): Promise<boolean> {
  const [released] = await input.db
    .delete(jobLeases)
    .where(and(eq(jobLeases.key, input.key), eq(jobLeases.owner, input.owner)))
    .returning({ key: jobLeases.key });
  return Boolean(released);
}
