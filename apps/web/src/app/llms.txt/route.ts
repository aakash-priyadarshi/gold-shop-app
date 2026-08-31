import { NextResponse } from "next/server";
import { getLlmsTxt } from "@/lib/llms-txt";
import { SITE_URL } from "@/config/site";

export const dynamic = "force-static";

/** https://www.orivraa.com/llms.txt — short product brief for AI fetchers and Google. */
export function GET() {
  return new NextResponse(getLlmsTxt(SITE_URL), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
