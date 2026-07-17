import { timingSafeEqual } from "node:crypto";

import {
  runDueSourceIngestion,
  runStoryProcessing,
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
  const provided = request.headers.get("x-bootstrap-secret") ?? "";
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(secret);
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

export async function POST(request: Request) {
  const secret = process.env.BOOTSTRAP_SECRET;
  if (!secret || !authorized(request, secret)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { db } = getDatabaseConnection();
  const ingestion = await runDueSourceIngestion({ db, logger });
  const processing = await runStoryProcessing({ db, logger });
  return NextResponse.json({ ingestion, processing });
}
