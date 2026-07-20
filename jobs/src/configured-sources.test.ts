import { SourceRegistry } from "@ai-news-navigator/sources";
import { describe, expect, it } from "vitest";

import { createConfiguredSources } from "./configured-sources.js";

describe("configured sources", () => {
  it("registers every source with a unique matching adapter", () => {
    const registry = new SourceRegistry();

    for (const source of createConfiguredSources()) {
      registry.register(source.definition, source.adapter);
    }

    expect(registry.list().map((source) => source.key)).toEqual([
      "openai-news",
      "product-hunt",
      "arxiv-ai",
      "hugging-face-models",
      "anthropic-news",
      "google-ai-blog",
      "hugging-face-daily-papers",
      "hacker-news-ai",
      "techcrunch-ai",
      "ars-technica-ai",
      "venturebeat-ai",
      "the-decoder",
    ]);
  });
});
