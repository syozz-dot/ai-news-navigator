import {
  analysisRuns,
  stories,
  storyAnalyses,
} from "@ai-news-navigator/database";
import { count, countDistinct, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabaseConnection } from "../../../../lib/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db } = getDatabaseConnection();
    const [runs, [storyTotal], [analyzedTotal]] = await Promise.all([
      db
        .select({
          id: analysisRuns.id,
          status: analysisRuns.status,
          configured: analysisRuns.configured,
          acquired: analysisRuns.acquired,
          provider: analysisRuns.provider,
          model: analysisRuns.model,
          attemptedCount: analysisRuns.attemptedCount,
          generatedCount: analysisRuns.generatedCount,
          skippedCount: analysisRuns.skippedCount,
          failedCount: analysisRuns.failedCount,
          errorMessages: analysisRuns.errorMessages,
          startedAt: analysisRuns.startedAt,
          finishedAt: analysisRuns.finishedAt,
        })
        .from(analysisRuns)
        .orderBy(desc(analysisRuns.startedAt))
        .limit(10),
      db.select({ count: count() }).from(stories),
      db
        .select({ count: countDistinct(storyAnalyses.storyId) })
        .from(storyAnalyses),
    ]);
    const totalStories = Number(storyTotal?.count ?? 0);
    const analyzedStories = Number(analyzedTotal?.count ?? 0);

    return NextResponse.json({
      stories: {
        total: totalStories,
        analyzed: analyzedStories,
        pending: Math.max(0, totalStories - analyzedStories),
      },
      runs,
    });
  } catch {
    return NextResponse.json(
      { error: "ANALYSIS_HEALTH_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
