import { NextResponse } from "next/server";

// IndexNow ownership-verification endpoint.
//
// IndexNow (Bing, Yandex, Seznam, Naver, etc.) verifies that the submitter
// owns the host by fetching a key file and checking it returns the exact key.
// We serve the key from the INDEXNOW_KEY env var so it can differ per
// environment without committing a token to the repo.
//
// The submission script (scripts/submit-urls-to-indexnow.ts) points
// `keyLocation` at this URL: e.g. https://www.orivraa.com/indexnow-key.txt
export const dynamic = "force-dynamic";

export function GET() {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return new NextResponse("IndexNow key not configured", { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
