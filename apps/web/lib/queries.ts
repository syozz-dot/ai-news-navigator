import {
  itemAssessments,
  items,
  sources,
  stories,
  storyAnalyses,
  storyItems,
  storyTopics,
  topics,
} from "@ai-news-navigator/database";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cache } from "react";

import { getDatabaseConnection } from "./database";

export type ContentType = typeof items.$inferSelect.contentType;
export type StoryStatus = typeof stories.$inferSelect.status;

export interface StoryFeedItem {
  id: string;
  slug: string;
  status: StoryStatus;
  title: string;
  translatedTitle: string | null;
  factualSummary: string | null;
  firstPublishedAt: Date | null;
  lastPublishedAt: Date | null;
  independentSourceCount: number;
  relevanceScore: number | null;
  overallScore: number | null;
  confidence: number | null;
  primaryItemId: string | null;
  excerpt: string | null;
  originalUrl: string | null;
  contentType: ContentType | null;
  sourceName: string | null;
  sourceSlug: string | null;
  matchedSignals: string[];
  assessmentReasons: string[];
  whyItMatters: string | null;
  hasAnalysis: boolean;
  topics: string[];
}

export interface SourceHealthItem {
  id: string;
  slug: string;
  name: string;
  type: typeof sources.$inferSelect.type;
  reliability: typeof sources.$inferSelect.reliability;
  status: typeof sources.$inferSelect.status;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
}

export interface StoryEvidenceItem {
  id: string;
  role: typeof storyItems.$inferSelect.role;
  title: string;
  excerpt: string | null;
  originalUrl: string;
  contentType: ContentType;
  author: string | null;
  sourcePublishedAt: Date | null;
  discoveredAt: Date;
  sourceName: string;
  sourceReliability: typeof sources.$inferSelect.reliability;
  matchedSignals: string[];
  relevanceScore: number | null;
}

export interface StoryDetail extends StoryFeedItem {
  evidence: StoryEvidenceItem[];
  analysis: {
    translatedTitle: string | null;
    factualSummary: string;
    whyItMatters: string | null;
    underlyingLogic: string | null;
    productImpact: string | null;
    productOpportunities: string[];
    openQuestions: string[];
    confidence: number;
    provider: string;
    model: string;
    createdAt: Date;
  } | null;
}

const publicStoryStatuses: StoryStatus[] = [
  "emerging",
  "confirmed",
  "cooling",
  "corrected",
];

async function hydrateFeedRows(
  baseRows: Array<{
    id: string;
    slug: string;
    status: StoryStatus;
    title: string;
    factualSummary: string | null;
    firstPublishedAt: Date | null;
    lastPublishedAt: Date | null;
    independentSourceCount: number;
    relevanceScore: number | null;
    overallScore: number | null;
    confidence: number | null;
    primaryItemId: string | null;
    excerpt: string | null;
    originalUrl: string | null;
    contentType: ContentType | null;
    sourceName: string | null;
    sourceSlug: string | null;
  }>,
): Promise<StoryFeedItem[]> {
  if (baseRows.length === 0) return [];
  const { db } = getDatabaseConnection();
  const storyIds = baseRows.map((row) => row.id);
  const itemIds = baseRows.flatMap((row) =>
    row.primaryItemId ? [row.primaryItemId] : [],
  );

  const [assessmentRows, analysisRows, topicRows] = await Promise.all([
    itemIds.length === 0
      ? []
      : db
          .select({
            itemId: itemAssessments.itemId,
            matchedSignals: itemAssessments.matchedSignals,
            reasons: itemAssessments.reasons,
            createdAt: itemAssessments.createdAt,
          })
          .from(itemAssessments)
          .where(inArray(itemAssessments.itemId, itemIds))
          .orderBy(desc(itemAssessments.createdAt)),
    db
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
    db
      .select({ storyId: storyTopics.storyId, name: topics.name })
      .from(storyTopics)
      .innerJoin(topics, eq(storyTopics.topicId, topics.id))
      .where(inArray(storyTopics.storyId, storyIds)),
  ]);

  const assessmentByItem = new Map<
    string,
    { matchedSignals: string[]; reasons: string[] }
  >();
  for (const row of assessmentRows) {
    if (!assessmentByItem.has(row.itemId))
      assessmentByItem.set(row.itemId, row);
  }
  const analysisByStory = new Map<
    string,
    {
      translatedTitle: string | null;
      factualSummary: string;
      whyItMatters: string | null;
    }
  >();
  for (const row of analysisRows) {
    if (!analysisByStory.has(row.storyId))
      analysisByStory.set(row.storyId, row);
  }
  const topicsByStory = new Map<string, string[]>();
  for (const row of topicRows) {
    const names = topicsByStory.get(row.storyId) ?? [];
    names.push(row.name);
    topicsByStory.set(row.storyId, names);
  }

  return baseRows.map((row) => {
    const assessment = row.primaryItemId
      ? assessmentByItem.get(row.primaryItemId)
      : undefined;
    const analysis = analysisByStory.get(row.id);
    return {
      ...row,
      translatedTitle: analysis?.translatedTitle ?? null,
      factualSummary: analysis?.factualSummary ?? row.factualSummary,
      matchedSignals: assessment?.matchedSignals ?? [],
      assessmentReasons: assessment?.reasons ?? [],
      whyItMatters: analysis?.whyItMatters ?? null,
      hasAnalysis: analysis !== undefined,
      topics: topicsByStory.get(row.id) ?? [],
    };
  });
}

export const getStoryFeed = cache(
  async (contentType?: ContentType, limit = 30) => {
    const { db } = getDatabaseConnection();
    const primaryItems = alias(items, "primary_items");
    const productSignalScore = sql<number>`coalesce((
      select max(${itemAssessments.productImpactScore})
      from ${itemAssessments}
      where ${itemAssessments.itemId} = ${primaryItems.id}
        and ${itemAssessments.isRelevant} = true
    ), 0)`;
    const productView = contentType === "product";
    const where = productView
      ? and(
          inArray(stories.status, publicStoryStatuses),
          sql`${productSignalScore} >= 0.25`,
        )
      : contentType
        ? and(
            inArray(stories.status, publicStoryStatuses),
            eq(primaryItems.contentType, contentType),
          )
        : inArray(stories.status, publicStoryStatuses);

    const [baseRows, totals] = await Promise.all([
      db
        .select({
          id: stories.id,
          slug: stories.slug,
          status: stories.status,
          title: stories.title,
          factualSummary: stories.factualSummary,
          firstPublishedAt: stories.firstPublishedAt,
          lastPublishedAt: stories.lastPublishedAt,
          independentSourceCount: stories.independentSourceCount,
          relevanceScore: stories.relevanceScore,
          overallScore: stories.overallScore,
          confidence: stories.confidence,
          primaryItemId: stories.primaryItemId,
          excerpt: primaryItems.excerpt,
          originalUrl: primaryItems.originalUrl,
          contentType: primaryItems.contentType,
          sourceName: sources.name,
          sourceSlug: sources.slug,
        })
        .from(stories)
        .leftJoin(primaryItems, eq(stories.primaryItemId, primaryItems.id))
        .leftJoin(sources, eq(primaryItems.sourceId, sources.id))
        .where(where)
        .orderBy(
          ...(productView ? [desc(productSignalScore)] : []),
          desc(
            sql`coalesce(${stories.overallScore}, ${stories.relevanceScore}, 0)`,
          ),
          desc(stories.lastPublishedAt),
        )
        .limit(limit),
      db
        .select({ count: count() })
        .from(stories)
        .leftJoin(primaryItems, eq(stories.primaryItemId, primaryItems.id))
        .where(where),
    ]);

    return {
      items: await hydrateFeedRows(baseRows),
      total: Number(totals[0]?.count ?? 0),
    };
  },
);

export const getSourceHealth = cache(async (): Promise<SourceHealthItem[]> => {
  const { db } = getDatabaseConnection();
  return db
    .select({
      id: sources.id,
      slug: sources.slug,
      name: sources.name,
      type: sources.type,
      reliability: sources.reliability,
      status: sources.status,
      lastSuccessAt: sources.lastSuccessAt,
      lastFailureAt: sources.lastFailureAt,
      consecutiveFailures: sources.consecutiveFailures,
    })
    .from(sources)
    .orderBy(asc(sources.status), asc(sources.name));
});

export const getStoryDetail = cache(
  async (slug: string): Promise<StoryDetail | null> => {
    const { db } = getDatabaseConnection();
    const primaryItems = alias(items, "primary_items");
    const [base] = await db
      .select({
        id: stories.id,
        slug: stories.slug,
        status: stories.status,
        title: stories.title,
        factualSummary: stories.factualSummary,
        firstPublishedAt: stories.firstPublishedAt,
        lastPublishedAt: stories.lastPublishedAt,
        independentSourceCount: stories.independentSourceCount,
        relevanceScore: stories.relevanceScore,
        overallScore: stories.overallScore,
        confidence: stories.confidence,
        primaryItemId: stories.primaryItemId,
        excerpt: primaryItems.excerpt,
        originalUrl: primaryItems.originalUrl,
        contentType: primaryItems.contentType,
        sourceName: sources.name,
        sourceSlug: sources.slug,
      })
      .from(stories)
      .leftJoin(primaryItems, eq(stories.primaryItemId, primaryItems.id))
      .leftJoin(sources, eq(primaryItems.sourceId, sources.id))
      .where(
        and(
          eq(stories.slug, slug),
          inArray(stories.status, publicStoryStatuses),
        ),
      )
      .limit(1);

    if (!base) return null;
    const [hydrated] = await hydrateFeedRows([base]);
    if (!hydrated) return null;

    const evidenceRows = await db
      .select({
        id: items.id,
        role: storyItems.role,
        title: items.title,
        excerpt: items.excerpt,
        originalUrl: items.originalUrl,
        contentType: items.contentType,
        author: items.author,
        sourcePublishedAt: items.sourcePublishedAt,
        discoveredAt: items.discoveredAt,
        sourceName: sources.name,
        sourceReliability: sources.reliability,
      })
      .from(storyItems)
      .innerJoin(items, eq(storyItems.itemId, items.id))
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(eq(storyItems.storyId, base.id))
      .orderBy(asc(storyItems.addedAt));

    const evidenceIds = evidenceRows.map((row) => row.id);
    const assessmentRows =
      evidenceIds.length === 0
        ? []
        : await db
            .select({
              itemId: itemAssessments.itemId,
              relevanceScore: itemAssessments.relevanceScore,
              matchedSignals: itemAssessments.matchedSignals,
              createdAt: itemAssessments.createdAt,
            })
            .from(itemAssessments)
            .where(inArray(itemAssessments.itemId, evidenceIds))
            .orderBy(desc(itemAssessments.createdAt));
    const assessmentByItem = new Map<
      string,
      { relevanceScore: number; matchedSignals: string[] }
    >();
    for (const row of assessmentRows) {
      if (!assessmentByItem.has(row.itemId))
        assessmentByItem.set(row.itemId, row);
    }

    const [analysis] = await db
      .select({
        translatedTitle: storyAnalyses.translatedTitle,
        factualSummary: storyAnalyses.factualSummary,
        whyItMatters: storyAnalyses.whyItMatters,
        underlyingLogic: storyAnalyses.underlyingLogic,
        productImpact: storyAnalyses.productImpact,
        productOpportunities: storyAnalyses.productOpportunities,
        openQuestions: storyAnalyses.openQuestions,
        confidence: storyAnalyses.confidence,
        provider: storyAnalyses.provider,
        model: storyAnalyses.model,
        createdAt: storyAnalyses.createdAt,
      })
      .from(storyAnalyses)
      .where(eq(storyAnalyses.storyId, base.id))
      .orderBy(desc(storyAnalyses.createdAt))
      .limit(1);

    return {
      ...hydrated,
      evidence: evidenceRows.map((row) => {
        const assessment = assessmentByItem.get(row.id);
        return {
          ...row,
          matchedSignals: assessment?.matchedSignals ?? [],
          relevanceScore: assessment?.relevanceScore ?? null,
        };
      }),
      analysis: analysis ?? null,
    };
  },
);
