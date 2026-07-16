import { RssSourceAdapter } from "../rss-adapter.js";
import type { SourceDefinition } from "../types.js";

export const openAiNewsSource = {
  key: "openai-news",
  name: "OpenAI News",
  type: "official_blog",
  reliability: "primary",
  connectorKey: "rss:openai-news",
  homepageUrl: "https://openai.com/news/",
  feedUrl: "https://openai.com/news/rss.xml",
  language: "en",
  isFirstParty: true,
  allowFullText: false,
  fetchIntervalMinutes: 30,
} satisfies SourceDefinition;

export function createOpenAiNewsAdapter(
  fetchImpl?: typeof fetch,
): RssSourceAdapter {
  return new RssSourceAdapter({
    key: openAiNewsSource.connectorKey,
    feedUrl: openAiNewsSource.feedUrl,
    contentType: "news",
    language: openAiNewsSource.language,
    maxItems: 50,
    includeContent: openAiNewsSource.allowFullText,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
