"use client";

import { MoreMenu } from "@/components/mobile/MoreMenu";

/**
 * Real /m/more route. The bottom-nav "More" button opens the menu as an
 * overlay, but in-app back-arrows, bookmarks, or any stray link to /m/more
 * previously 404'd. Rendering the shared menu here (in page mode) guarantees
 * the route always resolves to a usable page.
 */
export default function MobileMorePage() {
  return <MoreMenu />;
}
