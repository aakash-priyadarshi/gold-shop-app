import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      sha:
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        "unknown",
      environment:
        process.env.RAILWAY_ENVIRONMENT_NAME ||
        process.env.NODE_ENV ||
        "unknown",
      service: process.env.RAILWAY_SERVICE_NAME || "@gold-shop/web",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
