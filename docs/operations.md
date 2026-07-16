# Ingestion operations

## Commands

- `pnpm ingest:due` synchronizes configured source definitions, evaluates schedules, and runs only due sources. This is the production scheduler entry point.
- `pnpm ingest:all` forces an evaluation of every configured source while still respecting active leases. It is intended for manual backfills and smoke tests.
- `pnpm sources:health` prints the current operational state and next-run time for every source as JSON.
- `pnpm process:stories` assesses unprocessed items and creates or updates Stories in batches.

No hosted cron is enabled yet. A deployment scheduler should invoke `pnpm ingest:due` followed by `pnpm process:stories` on a short fixed cadence, such as every 15 minutes. The database remains the source of truth for whether each connector is actually due.

## Health states

- `never_run`: configured but no completed attempt exists; due immediately.
- `healthy`: the latest successful run is within two configured intervals.
- `degraded`: the last run was partial but did not fail at connector level.
- `failing`: one or more consecutive connector failures exist.
- `stale`: the latest success is older than two configured intervals.
- `disabled`: explicitly excluded from scheduling.

An active lease is reported separately because it is execution state, not source quality.

## Retry policy

Failed sources use exponential backoff based on their normal fetch interval:

```text
failure 1: 1x interval
failure 2: 2x interval
failure 3: 4x interval
...
maximum: 32x interval or 24 hours
```

A successful or partial fetch resets the consecutive connector-failure counter. Partial runs remain `degraded` until a fully successful run.

## Concurrency safety

Each source run acquires an atomic PostgreSQL lease before fetching. A second worker skips the source while the lease is active. Leases expire after 15 minutes so a crashed process cannot block ingestion permanently, and only the owning worker can release a live lease.

This lease applies to `ingest:due`, `ingest:all`, and the single-source OpenAI command.
