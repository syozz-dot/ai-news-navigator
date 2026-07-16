import { NextResponse } from "next/server";

import { getStoryFeed, type ContentType } from "../../../lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawType = searchParams.get("type");
  const allowedTypes: ContentType[] = [
    "news",
    "paper",
    "product",
    "release",
    "post",
    "other",
  ];
  const contentType =
    rawType && allowedTypes.includes(rawType as ContentType)
      ? (rawType as ContentType)
      : undefined;
  const requestedLimit = Number(searchParams.get("limit") ?? 30);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, Math.floor(requestedLimit)))
    : 30;

  try {
    const result = await getStoryFeed(contentType, limit);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "STORY_FEED_UNAVAILABLE",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
