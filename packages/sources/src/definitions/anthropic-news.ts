import { AnthropicNewsAdapter } from "../anthropic-news-adapter.js";
import type { SourceDefinition } from "../types.js";

export const anthropicNewsSource = {
  key: "anthropic-news",
  name: "Anthropic News",
  type: "official_blog",
  reliability: "primary",
  connectorKey: "html:anthropic-news",
  homepageUrl: "https://www.anthropic.com/news",
  language: "en",
  isFirstParty: true,
  allowFullText: false,
  fetchIntervalMinutes: 60,
} satisfies SourceDefinition;

export function createAnthropicNewsAdapter(fetchImpl?: typeof fetch) {
  return new AnthropicNewsAdapter({
    definition: anthropicNewsSource,
    maxItems: 30,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
