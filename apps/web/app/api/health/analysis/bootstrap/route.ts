import { analysisRuns } from "@ai-news-navigator/database";
import {
  createConfiguredStoryAnalyzer,
  runStoryAnalysis,
} from "@ai-news-navigator/jobs";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";
import { count } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabaseConnection } from "../../../../../lib/database";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

export async function POST(request: Request) {
  const { db } = getDatabaseConnection();
  const [existing] = await db.select({ count: count() }).from(analysisRuns);
  if (Number(existing?.count ?? 0) > 0) {
    return NextResponse.json({ status: "already-diagnosed" });
  }

  const analyzer = createConfiguredStoryAnalyzer({
    authorizationToken: request.headers.get("x-vercel-oidc-token"),
  });
  const analysis = await runStoryAnalysis({
    db,
    logger,
    analyzer,
    batchSize: 1,
    concurrency: 1,
  });
  return NextResponse.json({ status: "diagnosed", analysis });
}
