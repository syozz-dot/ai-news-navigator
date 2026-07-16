import { describe, expect, it } from "vitest";

import {
  findBestStoryMatch,
  scoreStoryCandidate,
  type ClusterDocument,
  type StoryCandidate,
} from "./clustering.js";

const publishedAt = new Date("2026-07-16T08:00:00Z");

function document(overrides: Partial<ClusterDocument>): ClusterDocument {
  return {
    id: "item-1",
    title: "OpenAI launches GPT-6 API for developers",
    contentType: "news",
    publishedAt,
    ...overrides,
  };
}

function candidate(overrides: Partial<StoryCandidate>): StoryCandidate {
  return {
    ...document({ id: "candidate-item" }),
    storyId: "story-1",
    ...overrides,
  };
}

describe("story clustering", () => {
  it("matches different headlines about the same launch", () => {
    const match = scoreStoryCandidate(
      document({}),
      candidate({
        title: "GPT-6 developer API is now available from OpenAI",
        publishedAt: new Date("2026-07-16T09:00:00Z"),
      }),
    );

    expect(match.matched).toBe(true);
    expect(match.score).toBeGreaterThanOrEqual(match.threshold);
    expect(match.reasons).toContain("Shared company, model, or repository");
  });

  it("rejects releases with conflicting versions", () => {
    const match = scoreStoryCandidate(
      document({
        title: "Ollama v0.32.0 released",
        contentType: "release",
        metadata: { repository: "ollama/ollama" },
      }),
      candidate({
        title: "Ollama v0.31.2 released",
        contentType: "release",
        metadata: { repository: "ollama/ollama" },
      }),
    );

    expect(match).toMatchObject({
      matched: false,
      score: 0,
      reasons: ["Hard conflict on content type, repository, or version"],
    });
  });

  it("keeps distinct actions about the same model separate", () => {
    const match = scoreStoryCandidate(
      document({ title: "OpenAI launches GPT-6 API" }),
      candidate({ title: "OpenAI changes GPT-6 pricing" }),
    );

    expect(match.matched).toBe(false);
    expect(match.components.actionConflictPenalty).toBe(0.12);
  });

  it("uses a conservative threshold for related papers", () => {
    const match = scoreStoryCandidate(
      document({
        title: "Efficient tool calling for language model agents",
        contentType: "paper",
      }),
      candidate({
        title: "Evaluating tool use in large language model agents",
        contentType: "paper",
      }),
    );

    expect(match.threshold).toBe(0.82);
    expect(match.matched).toBe(false);
  });

  it("selects only the strongest passing story", () => {
    const best = findBestStoryMatch(document({}), [
      candidate({
        storyId: "unrelated",
        title: "Anthropic updates Claude pricing",
      }),
      candidate({
        storyId: "same-launch",
        title: "GPT-6 developer API is now available from OpenAI",
      }),
    ]);

    expect(best?.storyId).toBe("same-launch");
  });
});
