import { NextResponse } from "next/server";

import { getStoryDetail } from "../../../../lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const story = await getStoryDetail(slug);
    if (!story)
      return NextResponse.json({ error: "STORY_NOT_FOUND" }, { status: 404 });
    return NextResponse.json(story);
  } catch (error) {
    return NextResponse.json(
      {
        error: "STORY_UNAVAILABLE",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
