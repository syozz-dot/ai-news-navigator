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
      "arxiv-ai",
      "github-ollama-ollama-releases",
      "github-vllm-project-vllm-releases",
    ]);
  });
});
