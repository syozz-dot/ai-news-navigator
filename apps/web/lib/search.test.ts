import { describe, expect, it } from "vitest";

import { normalizeSearchQuery, storySearchTerms } from "./search.js";

describe("Story search", () => {
  it("normalizes whitespace and ignores an empty query", () => {
    expect(normalizeSearchQuery("  多模态   Agent  ")).toBe("多模态 Agent");
    expect(normalizeSearchQuery("   ")).toBeUndefined();
  });

  it("limits terms and escapes SQL wildcard characters", () => {
    expect(storySearchTerms("Agent 100% _test")).toEqual([
      "Agent",
      "100\\%",
      "\\_test",
    ]);
    expect(storySearchTerms("1 2 3 4 5 6 7")).toHaveLength(6);
  });
});
