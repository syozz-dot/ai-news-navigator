import { timingSafeEqual } from "node:crypto";

import {
  generateReportSnapshot,
  type ReportType,
} from "@ai-news-navigator/jobs";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";
import { NextResponse } from "next/server";

import { getDatabaseConnection } from "../../../../lib/database";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

function authorized(request: Request, secret: string) {
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!authorized(request, secret)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const type = searchParams.get("type") ?? "daily";
  if (!(["daily", "weekly", "monthly"] as string[]).includes(type)) {
    return NextResponse.json({ error: "INVALID_REPORT_TYPE" }, { status: 400 });
  }

  try {
    const { db } = getDatabaseConnection();
    const periodKey = searchParams.get("period")?.trim();
    const result = await generateReportSnapshot({
      db,
      logger,
      type: type as ReportType,
      useModel: searchParams.get("model") !== "0",
      ...(periodKey ? { periodKey } : {}),
    });
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Report generation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "REPORT_GENERATION_FAILED" },
      { status: 500 },
    );
  }
}
