import {
  itemAssessments,
  items,
  stories,
  storyAnalyses,
  storyTopics,
  topics,
  type Database,
} from "@ai-news-navigator/database";
import {
  classifyStoryTopics,
  CURATED_TOPICS,
  TOPIC_CLASSIFIER_VERSION,
} from "@ai-news-navigator/intelligence";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";
import { and, desc, eq, inArray, like } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { acquireJobLease, releaseJobLease } from "./job-lease.js";
import { createLeaseOwner } from "./source-executor.js";

export interface TopicClassificationResult {
  acquired: boolean;
  topicCount: number;
  storyCount: number;
  classifiedStoryCount: number;
  assignmentCount: number;
}

const classifiableStatuses = [
  "emerging",
  "confirmed",
  "cooling",
  "corrected",
] as const;

export async function runTopicClassification(input: {
  db: Database;
  logger: IngestionLogger;
  limit?: number;
}): Promise<TopicClassificationResult> {
  const result: TopicClassificationResult = {
    acquired: false,
    topicCount: CURATED_TOPICS.length,
    storyCount: 0,
    classifiedStoryCount: 0,
    assignmentCount: 0,
  };
  const leaseOwner = createLeaseOwner();
  result.acquired = await acquireJobLease({
    db: input.db,
    key: "topic-classification",
    owner: leaseOwner,
    durationMs: 5 * 60_000,
  });
  if (!result.acquired) {
    input.logger.info(
      "Topic classification skipped because another worker owns the lease",
    );
    return result;
  }

  try {
    const topicIds = await syncCuratedTopics(input.db);
    const primaryItems = alias(items, "topic_primary_items");
    const storyRows = await input.db
      .select({
        id: stories.id,
        title: stories.title,
        factualSummary: stories.factualSummary,
        primaryItemId: stories.primaryItemId,
        excerpt: primaryItems.excerpt,
      })
      .from(stories)
      .leftJoin(primaryItems, eq(stories.primaryItemId, primaryItems.id))
      .where(inArray(stories.status, [...classifiableStatuses]))
      .orderBy(desc(stories.lastPublishedAt))
      .limit(input.limit ?? 2_000);
    result.storyCount = storyRows.length;
    if (storyRows.length === 0) return result;

    const storyIds = storyRows.map((story) => story.id);
    const itemIds = storyRows.flatMap((story) =>
      story.primaryItemId ? [story.primaryItemId] : [],
    );
    const [assessmentRows, analysisRows] = await Promise.all([
      itemIds.length === 0
        ? []
        : input.db
            .select({
              itemId: itemAssessments.itemId,
              matchedSignals: itemAssessments.matchedSignals,
              createdAt: itemAssessments.createdAt,
            })
            .from(itemAssessments)
            .where(inArray(itemAssessments.itemId, itemIds))
            .orderBy(desc(itemAssessments.createdAt)),
      input.db
        .select({
          storyId: storyAnalyses.storyId,
          translatedTitle: storyAnalyses.translatedTitle,
          factualSummary: storyAnalyses.factualSummary,
          whyItMatters: storyAnalyses.whyItMatters,
          createdAt: storyAnalyses.createdAt,
        })
        .from(storyAnalyses)
        .where(inArray(storyAnalyses.storyId, storyIds))
        .orderBy(desc(storyAnalyses.createdAt)),
    ]);

    const assessmentByItem = new Map<string, (typeof assessmentRows)[number]>();
    for (const assessment of assessmentRows) {
      if (!assessmentByItem.has(assessment.itemId)) {
        assessmentByItem.set(assessment.itemId, assessment);
      }
    }
    const analysisByStory = new Map<string, (typeof analysisRows)[number]>();
    for (const analysis of analysisRows) {
      if (!analysisByStory.has(analysis.storyId)) {
        analysisByStory.set(analysis.storyId, analysis);
      }
    }

    const assignments = storyRows.flatMap((story) => {
      const analysis = analysisByStory.get(story.id);
      const assessment = story.primaryItemId
        ? assessmentByItem.get(story.primaryItemId)
        : undefined;
      const matches = classifyStoryTopics({
        title: story.title,
        excerpt: story.excerpt,
        translatedTitle: analysis?.translatedTitle,
        factualSummary: analysis?.factualSummary ?? story.factualSummary,
        whyItMatters: analysis?.whyItMatters,
        matchedSignals: assessment?.matchedSignals,
      });
      if (matches.length > 0) result.classifiedStoryCount += 1;
      return matches.flatMap((match) => {
        const topicId = topicIds.get(match.slug);
        return topicId
          ? [
              {
                storyId: story.id,
                topicId,
                confidence: match.confidence,
                assignedBy: TOPIC_CLASSIFIER_VERSION,
              },
            ]
          : [];
      });
    });

    await input.db.transaction(async (transaction) => {
      await transaction
        .delete(storyTopics)
        .where(
          and(
            inArray(storyTopics.storyId, storyIds),
            like(storyTopics.assignedBy, "topic-rules-%"),
          ),
        );
      if (assignments.length > 0) {
        await transaction
          .insert(storyTopics)
          .values(assignments)
          .onConflictDoNothing();
      }
    });
    result.assignmentCount = assignments.length;
    input.logger.info("Topic classification finished", { ...result });
    return result;
  } finally {
    const released = await releaseJobLease({
      db: input.db,
      key: "topic-classification",
      owner: leaseOwner,
    });
    if (!released) {
      input.logger.warn("Topic classification lease was no longer owned");
    }
  }
}

async function syncCuratedTopics(db: Database): Promise<Map<string, string>> {
  for (const topic of CURATED_TOPICS) {
    await db
      .insert(topics)
      .values({
        slug: topic.slug,
        name: topic.name,
        type: "technology",
        description: topic.description,
        aliases: [...topic.aliases],
        isActive: true,
      })
      .onConflictDoUpdate({
        target: topics.slug,
        set: {
          name: topic.name,
          type: "technology",
          description: topic.description,
          aliases: [...topic.aliases],
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  const rows = await db
    .select({ id: topics.id, slug: topics.slug })
    .from(topics)
    .where(
      inArray(
        topics.slug,
        CURATED_TOPICS.map((topic) => topic.slug),
      ),
    );
  return new Map(rows.map((topic) => [topic.slug, topic.id]));
}
