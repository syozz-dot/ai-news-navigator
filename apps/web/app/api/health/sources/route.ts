import { NextResponse } from "next/server";

import { getSourceHealth } from "../../../../lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sources = await getSourceHealth();
    return NextResponse.json({ sources });
  } catch (error) {
    return NextResponse.json(
      {
        error: "SOURCE_HEALTH_UNAVAILABLE",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
