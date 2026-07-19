import { describe, expect, it } from "vitest";

import { classifyStoryTopics, CURATED_TOPICS } from "./topics.js";

describe("curated Story topics", () => {
  it("keeps the initial topic set focused and stable", () => {
    expect(CURATED_TOPICS).toHaveLength(10);
    expect(CURATED_TOPICS.map((topic) => topic.slug)).toEqual([
      "agent",
      "ai-coding",
      "ai-video",
      "image-generation",
      "safety-alignment",
      "embodied-ai",
      "llm-reasoning",
      "multimodal",
      "voice-audio",
      "open-source",
    ]);
  });

  it("assigns overlapping topics when the evidence supports them", () => {
    const matches = classifyStoryTopics({
      title: "Open-source multimodal coding agent released",
      excerpt:
        "The model can inspect screenshots, call tools and edit a repository.",
      matchedSignals: ["ai:agents", "ai:multimodal", "product:open-source"],
    });

    expect(matches.map((match) => match.slug)).toEqual(
      expect.arrayContaining([
        "agent",
        "ai-coding",
        "multimodal",
        "open-source",
      ]),
    );
  });

  it("uses Chinese analysis fields for historical backfill", () => {
    const matches = classifyStoryTopics({
      title: "A new research release",
      factualSummary:
        "这是一套面向人形机器人的具身基础模型，可控制机械臂完成操作任务。",
    });

    expect(matches.map((match) => match.slug)).toContain("embodied-ai");
  });

  it("does not treat generic video input as video generation", () => {
    const matches = classifyStoryTopics({
      title: "A multimodal model accepts video input",
      matchedSignals: ["ai:multimodal"],
    });

    expect(matches.map((match) => match.slug)).toContain("multimodal");
    expect(matches.map((match) => match.slug)).not.toContain("ai-video");
  });

  it("uses broad assessment signals only as supporting evidence", () => {
    const matches = classifyStoryTopics({
      title: "ThinkingCap reduces reasoning tokens on benchmark suites",
      factualSummary:
        "The fine-tuned language model preserves accuracy while lowering inference cost.",
      matchedSignals: ["ai:agents", "ai:multimodal", "product:safety-policy"],
    });

    expect(matches.map((match) => match.slug)).toContain("llm-reasoning");
    expect(matches.map((match) => match.slug)).not.toContain("agent");
    expect(matches.map((match) => match.slug)).not.toContain("multimodal");
    expect(matches.map((match) => match.slug)).not.toContain(
      "safety-alignment",
    );
  });
});
