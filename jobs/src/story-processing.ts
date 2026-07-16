import {
  itemAssessments,
  items,
  stories,
  storyItems,
  type Database,
} from "@ai-news-navigator/database";
import {
  CLUSTERING_VERSION,
  RELEVANCE_SCORER_VERSION,
  findBestStoryMatch,
  scoreItemRelevance,
  type ClusterScore,
  type StoryCandidate,
} from "@ai-news-navigator/intelligence";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface StoryProcessingResult {
  assessedCount: number;
  relevantCount: number;
  irrelevantCount: number;
  storiesCreatedCount: number;
  storiesMatchedCount: number;
  skippedCount: number;
  failedCount: number;
}

interface ProcessableItem {
  id: string;
  sourceId: string;
  title: string;
  excerpt: string | null;
  contentType: typeof items.$inferSelect.contentType;
  sourcePublishedAt: Date | null;
  discoveredAt: Date;
  rawMetadata: Record<string, unknown>;
}

function storySlug(title: string, itemId: string): string {
  const readable = title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
  return `${readable || "story"}-${itemId.replaceAll("-", "").slice(0, 10)}`;
}

export class PostgresStoryProcessor {
  constructor(
    private readonly db: Database,
    private readonly logger: IngestionLogger,
  ) {}

  async processBatch(limit = 100): Promise<StoryProcessingResult> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
      throw new Error(
        "Story processing batch limit must be between 1 and 1000",
      );
    }

    const pending = await this.#getPendingItems(limit);
    const result: StoryProcessingResult = {
      assessedCount: 0,
      relevantCount: 0,
      irrelevantCount: 0,
      storiesCreatedCount: 0,
      storiesMatchedCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };

    for (const item of pending) {
      try {
        const assessment = scoreItemRelevance({
          title: item.title,
          excerpt: item.excerpt,
          contentType: item.contentType,
          metadata: item.rawMetadata,
        });
        const publishedAt = item.sourcePublishedAt ?? item.discoveredAt;
        const candidates = assessment.isRelevant
          ? await this.#getCandidates(publishedAt)
          : [];
        const match = assessment.isRelevant
          ? findBestStoryMatch(
              {
                id: item.id,
                title: item.title,
                excerpt: item.excerpt,
                contentType: item.contentType,
                publishedAt,
                metadata: item.rawMetadata,
              },
              candidates,
            )
          : null;
        const persisted = await this.#persistDecision({
          item,
          publishedAt,
          assessment,
          match,
        });

        if (!persisted) {
          result.skippedCount += 1;
          continue;
        }
        result.assessedCount += 1;
        if (!assessment.isRelevant) {
          result.irrelevantCount += 1;
        } else if (match) {
          result.relevantCount += 1;
          result.storiesMatchedCount += 1;
        } else {
          result.relevantCount += 1;
          result.storiesCreatedCount += 1;
        }
      } catch (error) {
        result.failedCount += 1;
        this.logger.error("Item relevance or clustering failed", {
          itemId: item.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  async #getPendingItems(limit: number): Promise<ProcessableItem[]> {
    return this.db
      .select({
        id: items.id,
        sourceId: items.sourceId,
        title: items.title,
        excerpt: items.excerpt,
        contentType: items.contentType,
        sourcePublishedAt: items.sourcePublishedAt,
        discoveredAt: items.discoveredAt,
        rawMetadata: items.rawMetadata,
      })
      .from(items)
      .leftJoin(
        itemAssessments,
        and(
          eq(itemAssessments.itemId, items.id),
          eq(itemAssessments.scorerVersion, RELEVANCE_SCORER_VERSION),
        ),
      )
      .where(isNull(itemAssessments.id))
      .orderBy(asc(items.discoveredAt))
      .limit(limit);
  }

  async #getCandidates(publishedAt: Date): Promise<StoryCandidate[]> {
    const primaryItems = alias(items, "primary_items");
    const lowerBound = new Date(publishedAt.getTime() - 72 * 3_600_000);
    const upperBound = new Date(publishedAt.getTime() + 72 * 3_600_000);
    const rows = await this.db
      .select({
        storyId: stories.id,
        id: primaryItems.id,
        title: stories.title,
        excerpt: primaryItems.excerpt,
        contentType: primaryItems.contentType,
        sourcePublishedAt: primaryItems.sourcePublishedAt,
        discoveredAt: primaryItems.discoveredAt,
        metadata: primaryItems.rawMetadata,
      })
      .from(stories)
      .innerJoin(primaryItems, eq(stories.primaryItemId, primaryItems.id))
      .where(
        and(
          inArray(stories.status, ["emerging", "confirmed"]),
          gte(stories.lastPublishedAt, lowerBound),
          lte(stories.firstPublishedAt, upperBound),
        ),
      )
      .orderBy(desc(stories.lastPublishedAt))
      .limit(200);

    return rows.map((row) => ({
      storyId: row.storyId,
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      contentType: row.contentType,
      publishedAt: row.sourcePublishedAt ?? row.discoveredAt,
      metadata: row.metadata,
    }));
  }

  async #persistDecision(input: {
    item: ProcessableItem;
    publishedAt: Date;
    assessment: ReturnType<typeof scoreItemRelevance>;
    match: ClusterScore | null;
  }): Promise<boolean> {
    return this.db.transaction(async (transaction) => {
      const [assessment] = await transaction
        .insert(itemAssessments)
        .values({
          itemId: input.item.id,
          scorerVersion: input.assessment.scorerVersion,
          relevanceScore: input.assessment.relevanceScore,
          aiCentralityScore: input.assessment.aiCentralityScore,
          productImpactScore: input.assessment.productImpactScore,
          isRelevant: input.assessment.isRelevant,
          matchedSignals: input.assessment.matchedSignals,
          reasons: input.assessment.reasons,
        })
        .onConflictDoNothing()
        .returning({ id: itemAssessments.id });
      if (!assessment) return false;

      if (input.assessment.isRelevant) {
        if (input.match) {
          await transaction.insert(storyItems).values({
            storyId: input.match.storyId,
            itemId: input.item.id,
            role: "supporting",
            similarity: input.match.score,
            clusterVersion: CLUSTERING_VERSION,
            matchReasons: input.match.reasons,
          });

          const [sourceCount] = await transaction
            .select({ count: countDistinct(items.sourceId) })
            .from(storyItems)
            .innerJoin(items, eq(storyItems.itemId, items.id))
            .where(eq(storyItems.storyId, input.match.storyId));
          const [currentStory] = await transaction
            .select({
              firstPublishedAt: stories.firstPublishedAt,
              lastPublishedAt: stories.lastPublishedAt,
              relevanceScore: stories.relevanceScore,
            })
            .from(stories)
            .where(eq(stories.id, input.match.storyId))
            .limit(1);
          if (!currentStory) {
            throw new Error("Matched Story no longer exists");
          }
          const independentSourceCount = Number(sourceCount?.count ?? 1);
          const firstPublishedAt = currentStory.firstPublishedAt
            ? new Date(
                Math.min(
                  currentStory.firstPublishedAt.getTime(),
                  input.publishedAt.getTime(),
                ),
              )
            : input.publishedAt;
          const lastPublishedAt = currentStory.lastPublishedAt
            ? new Date(
                Math.max(
                  currentStory.lastPublishedAt.getTime(),
                  input.publishedAt.getTime(),
                ),
              )
            : input.publishedAt;
          await transaction
            .update(stories)
            .set({
              firstPublishedAt,
              lastPublishedAt,
              independentSourceCount,
              relevanceScore: Math.max(
                currentStory.relevanceScore ?? 0,
                input.assessment.relevanceScore,
              ),
              status: independentSourceCount >= 2 ? "confirmed" : "emerging",
              updatedAt: new Date(),
            })
            .where(eq(stories.id, input.match.storyId));
        } else {
          const [story] = await transaction
            .insert(stories)
            .values({
              slug: storySlug(input.item.title, input.item.id),
              status: "emerging",
              title: input.item.title,
              primaryItemId: input.item.id,
              firstPublishedAt: input.publishedAt,
              lastPublishedAt: input.publishedAt,
              independentSourceCount: 1,
              relevanceScore: input.assessment.relevanceScore,
            })
            .returning({ id: stories.id });
          if (!story) throw new Error("Story creation did not return an id");
          await transaction.insert(storyItems).values({
            storyId: story.id,
            itemId: input.item.id,
            role: "primary",
            similarity: 1,
            clusterVersion: CLUSTERING_VERSION,
            matchReasons: ["Primary item created the story"],
          });
        }
      }

      await transaction
        .update(items)
        .set({
          status: "processed",
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(items.id, input.item.id));
      return true;
    });
  }
}
