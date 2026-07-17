import { RssSourceAdapter } from "../rss-adapter.js";
import type { SourceAdapter, SourceDefinition } from "../types.js";

export const productHuntSource = {
  key: "product-hunt",
  name: "Product Hunt",
  type: "product_hunt",
  reliability: "high",
  connectorKey: "rss:product-hunt",
  homepageUrl: "https://www.producthunt.com/",
  feedUrl: "https://www.producthunt.com/feed",
  language: "en",
  isFirstParty: false,
  allowFullText: false,
  fetchIntervalMinutes: 60,
} satisfies SourceDefinition;

export function createProductHuntAdapter(
  fetchImpl?: typeof fetch,
): SourceAdapter {
  const rss = new RssSourceAdapter({
    key: productHuntSource.connectorKey,
    feedUrl: productHuntSource.feedUrl,
    contentType: "product",
    language: productHuntSource.language,
    maxItems: 50,
    includeContent: productHuntSource.allowFullText,
    useContentAsExcerpt: true,
    maxExcerptCharacters: 500,
    ...(fetchImpl ? { fetchImpl } : {}),
  });

  return {
    key: productHuntSource.connectorKey,
    async fetch(context) {
      const items = await rss.fetch(context);
      return items.map((item) => {
        const { excerpt: originalExcerpt, ...rest } = item;
        const excerpt = originalExcerpt
          ?.replace(/\s*Discussion\s*\|\s*Link\s*$/i, "")
          .trim();
        return {
          ...rest,
          ...(excerpt ? { excerpt } : {}),
        };
      });
    },
  };
}
