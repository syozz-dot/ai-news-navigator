import { describe, expect, it } from "vitest";

import { scoreItemRelevance } from "./relevance.js";

describe("scoreItemRelevance", () => {
  it("keeps product-relevant AI releases", () => {
    const result = scoreItemRelevance({
      contentType: "release",
      title: "Ollama launches a faster agent runtime",
      excerpt:
        "The release improves LLM inference latency, tool calling, and developer workflows.",
    });

    expect(result.isRelevant).toBe(true);
    expect(result.relevanceScore).toBeGreaterThan(0.6);
    expect(result.matchedSignals).toEqual(
      expect.arrayContaining([
        "ai:large-language-model",
        "ai:inference",
        "product:performance",
      ]),
    );
  });

  it("filters category-adjacent papers without meaningful AI centrality", () => {
    const result = scoreItemRelevance({
      contentType: "paper",
      title: "Neural population decoding in laboratory mice",
      excerpt:
        "A statistical study of population activity in a neuroscience experiment.",
      metadata: { categories: ["cs.LG"] },
    });

    expect(result.isRelevant).toBe(false);
    expect(result.relevanceScore).toBeLessThan(0.42);
  });

  it("keeps AI papers with product-facing technical implications", () => {
    const result = scoreItemRelevance({
      contentType: "paper",
      title: "Efficient tool calling for large language model agents",
      excerpt:
        "We benchmark a faster inference method for agentic developer workflows.",
      metadata: { categories: ["cs.AI", "cs.CL"] },
    });

    expect(result.isRelevant).toBe(true);
    expect(result.aiCentralityScore).toBeGreaterThan(0.6);
    expect(result.productImpactScore).toBeGreaterThan(0.3);
    expect(result.reasons).toContain("Passed paper threshold 0.42");
  });

  it("keeps AI policy and investment headlines without requiring model jargon", () => {
    const safety = scoreItemRelevance({
      contentType: "news",
      title: "The US is advancing AI safety through state and federal action",
    });
    const investment = scoreItemRelevance({
      contentType: "news",
      title: "How to manage AI investments in the agentic era",
    });
    const adoption = scoreItemRelevance({
      contentType: "news",
      title: "How sales teams use ChatGPT Work",
    });

    expect(safety.isRelevant).toBe(true);
    expect(investment.isRelevant).toBe(true);
    expect(adoption.isRelevant).toBe(true);
  });
});
