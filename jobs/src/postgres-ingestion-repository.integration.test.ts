import {
  createDatabase,
  items,
  sourceRuns,
  sources,
  type Database,
} from "@ai-news-navigator/database";
import { normalizeItem } from "@ai-news-navigator/pipeline";
import type { SourceDefinition } from "@ai-news-navigator/sources";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  PostgresIngestionRepository,
  syncSourceDefinition,
} from "./postgres-ingestion-repository.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("PostgresIngestionRepository", () => {
  let client: ReturnType<typeof createDatabase>["client"];
  let db: Database;
  let repository: PostgresIngestionRepository;
  let sourceId: string;

  const definition: SourceDefinition = {
    key: `integration-source-${Date.now()}`,
    name: "Integration Source",
    type: "rss",
    reliability: "high",
    connectorKey: "rss:integration",
    homepageUrl: "https://example.com",
    feedUrl: "https://example.com/rss.xml",
    language: "en",
    isFirstParty: false,
    allowFullText: false,
    fetchIntervalMinutes: 60,
  };

  beforeAll(async () => {
    const database = createDatabase(databaseUrl);
    client = database.client;
    db = database.db;
    repository = new PostgresIngestionRepository(db);
    sourceId = (await syncSourceDefinition(db, definition)).id;
  });

  afterAll(async () => {
    if (db && sourceId) {
      await db.delete(items).where(eq(items.sourceId, sourceId));
      await db.delete(sources).where(eq(sources.id, sourceId));
    }
    if (client) {
      await client.end();
    }
  });

  it("deduplicates items and records successful source health", async () => {
    const startedAt = new Date("2026-07-16T03:00:00Z");
    const finishedAt = new Date("2026-07-16T03:00:05Z");
    const runId = await repository.startSourceRun({ sourceId, startedAt });
    const normalized = normalizeItem({
      sourceId,
      fetchedAt: startedAt,
      raw: {
        externalId: "official-1",
        contentType: "news",
        title: "Official update",
        url: "https://example.com/news/official-1?utm_source=rss",
        publishedAt: "2026-07-16T02:00:00Z",
      },
    });

    const inserted = await repository.upsertItem(normalized);
    const duplicate = await repository.upsertItem({
      ...normalized,
      originalUrl: "https://example.com/news/renamed",
      canonicalUrl: "https://example.com/news/renamed",
      canonicalUrlHash: "a".repeat(64),
    });

    expect(inserted.created).toBe(true);
    expect(duplicate).toEqual({ id: inserted.id, created: false });

    await repository.finishSourceRun(runId, {
      status: "succeeded",
      fetchedCount: 2,
      storedCount: 1,
      duplicateCount: 1,
      failedCount: 0,
      errorMessage: null,
      finishedAt,
    });

    const [run] = await db
      .select()
      .from(sourceRuns)
      .where(eq(sourceRuns.id, runId));
    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, sourceId));

    expect(run).toMatchObject({
      status: "succeeded",
      fetchedCount: 2,
      storedCount: 1,
      duplicateCount: 1,
    });
    expect(source).toMatchObject({
      status: "active",
      consecutiveFailures: 0,
      lastSuccessAt: finishedAt,
    });
  });

  it("marks the source degraded after a failed run", async () => {
    const startedAt = new Date("2026-07-16T04:00:00Z");
    const finishedAt = new Date("2026-07-16T04:00:03Z");
    const runId = await repository.startSourceRun({ sourceId, startedAt });

    await repository.finishSourceRun(runId, {
      status: "failed",
      fetchedCount: 0,
      storedCount: 0,
      duplicateCount: 0,
      failedCount: 0,
      errorMessage: "upstream unavailable",
      finishedAt,
    });

    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, sourceId));

    expect(source).toMatchObject({
      status: "degraded",
      consecutiveFailures: 1,
      lastFailureAt: finishedAt,
    });
  });
});
