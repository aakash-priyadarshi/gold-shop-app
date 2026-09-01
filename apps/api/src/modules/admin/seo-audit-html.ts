export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function stripNoscriptBlocks(html: string): string {
  return html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ");
}

export function countH1Tags(html: string): number {
  const matches = stripNoscriptBlocks(html).match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi);
  return matches ? matches.length : 0;
}
