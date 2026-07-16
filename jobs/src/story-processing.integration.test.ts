import {
  createDatabase,
  itemAssessments,
  items,
  stories,
  storyItems,
  sources,
  type Database,
} from "@ai-news-navigator/database";
import { normalizeItem } from "@ai-news-navigator/pipeline";
import type { SourceDefinition } from "@ai-news-navigator/sources";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  PostgresIngestionRepository,
  syncSourceDefinition,
} from "./postgres-ingestion-repository.js";
import { acquireJobLease, releaseJobLease } from "./job-lease.js";
import { PostgresStoryProcessor } from "./story-processing.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("PostgresStoryProcessor", () => {
  let client: ReturnType<typeof createDatabase>["client"];
  let db: Database;
  let sourceIds: string[] = [];
  let itemIds: string[] = [];

  const definition = (suffix: string): SourceDefinition => ({
    key: `story-integration-${suffix}-${Date.now()}`,
    name: `Story Integration ${suffix}`,
    type: "official_blog",
    reliability: "primary",
    connectorKey: `rss:story-integration-${suffix}`,
    homepageUrl: `https://${suffix}.example.com`,
    feedUrl: `https://${suffix}.example.com/rss.xml`,
    language: "en",
    isFirstParty: true,
    allowFullText: false,
    fetchIntervalMinutes: 60,
  });

  beforeAll(async () => {
    const database = createDatabase(databaseUrl);
    client = database.client;
    db = database.db;
    const firstSource = await syncSourceDefinition(db, definition("first"));
    const secondSource = await syncSourceDefinition(db, definition("second"));
    sourceIds = [firstSource.id, secondSource.id];

    const repository = new PostgresIngestionRepository(db);
    const rawItems = [
      normalizeItem({
        sourceId: firstSource.id,
        fetchedAt: new Date("2026-07-16T08:05:00Z"),
        discoveredAt: new Date("2026-07-16T08:05:00Z"),
        raw: {
          externalId: "gpt-6-launch-first",
          contentType: "news",
          title: "OpenAI launches GPT-6 API for developers",
          excerpt:
            "The new large language model API adds tool calling and faster inference.",
          url: "https://first.example.com/gpt-6-launch",
          publishedAt: "2026-07-16T08:00:00Z",
        },
      }),
      normalizeItem({
        sourceId: secondSource.id,
        fetchedAt: new Date("2026-07-16T09:05:00Z"),
        discoveredAt: new Date("2026-07-16T09:05:00Z"),
        raw: {
          externalId: "gpt-6-launch-second",
          contentType: "news",
          title: "GPT-6 developer API is now available from OpenAI",
          excerpt:
            "Developers can use the reasoning model through a new SDK and API.",
          url: "https://second.example.com/openai-gpt-6-api",
          publishedAt: "2026-07-16T09:00:00Z",
        },
      }),
      normalizeItem({
        sourceId: firstSource.id,
        fetchedAt: new Date("2026-07-16T10:05:00Z"),
        discoveredAt: new Date("2026-07-16T10:05:00Z"),
        raw: {
          externalId: "neural-population-decoding",
          contentType: "paper",
          title: "Neural population decoding in laboratory mice",
          excerpt:
            "A statistical study of population activity in a neuroscience experiment.",
          url: "https://first.example.com/neural-population-decoding",
          publishedAt: "2026-07-16T10:00:00Z",
          metadata: { categories: ["cs.LG"] },
        },
      }),
    ];

    for (const item of rawItems) {
      const stored = await repository.upsertItem(item);
      itemIds.push(stored.id);
    }
  });

  afterAll(async () => {
    if (db && itemIds.length > 0) {
      const linkedStories = await db
        .select({ id: storyItems.storyId })
        .from(storyItems)
        .where(inArray(storyItems.itemId, itemIds));
      if (linkedStories.length > 0) {
        await db.delete(stories).where(
          inArray(
            stories.id,
            linkedStories.map((story) => story.id),
          ),
        );
      }
      await db.delete(items).where(inArray(items.id, itemIds));
    }
    if (db && sourceIds.length > 0) {
      await db.delete(sources).where(inArray(sources.id, sourceIds));
    }
    if (client) await client.end();
  });

  it("scores, clusters, and remains idempotent", async () => {
    const processor = new PostgresStoryProcessor(db, {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    });

    await expect(processor.processBatch(100)).resolves.toEqual({
      assessedCount: 3,
      relevantCount: 2,
      irrelevantCount: 1,
      storiesCreatedCount: 1,
      storiesMatchedCount: 1,
      skippedCount: 0,
      failedCount: 0,
    });

    const assessments = await db
      .select()
      .from(itemAssessments)
      .where(inArray(itemAssessments.itemId, itemIds));
    expect(assessments).toHaveLength(3);
    expect(
      assessments.filter((assessment) => assessment.isRelevant),
    ).toHaveLength(2);

    const links = await db
      .select()
      .from(storyItems)
      .where(inArray(storyItems.itemId, itemIds));
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.role).sort()).toEqual([
      "primary",
      "supporting",
    ]);
    expect(links.every((link) => link.clusterVersion === "lexical-v1")).toBe(
      true,
    );

    const [story] = await db
      .select()
      .from(stories)
      .where(
        eq(
          stories.id,
          links[0]?.storyId ?? "00000000-0000-0000-0000-000000000000",
        ),
      );
    expect(story).toMatchObject({
      status: "confirmed",
      independentSourceCount: 2,
    });

    const statuses = await db
      .select({ status: items.status })
      .from(items)
      .where(inArray(items.id, itemIds));
    expect(statuses.every((item) => item.status === "processed")).toBe(true);

    await expect(processor.processBatch(100)).resolves.toMatchObject({
      assessedCount: 0,
      storiesCreatedCount: 0,
      storiesMatchedCount: 0,
    });
  });

  it("prevents overlapping story-processing jobs", async () => {
    const key = `story-processing-integration-${Date.now()}`;
    const now = new Date("2026-07-16T12:00:00Z");

    await expect(
      acquireJobLease({ db, key, owner: "worker-1", now }),
    ).resolves.toBe(true);
    await expect(
      acquireJobLease({ db, key, owner: "worker-2", now }),
    ).resolves.toBe(false);
    await expect(releaseJobLease({ db, key, owner: "worker-2" })).resolves.toBe(
      false,
    );
    await expect(releaseJobLease({ db, key, owner: "worker-1" })).resolves.toBe(
      true,
    );
  });
});
