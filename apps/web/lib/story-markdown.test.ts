import { describe, expect, it } from "vitest";

import { buildStoryMarkdown, type StoryMarkdownInput } from "./story-markdown";

const story: StoryMarkdownInput = {
  slug: "example-story",
  title: "示例中文标题",
  originalTitle: "Example original title",
  contentType: "模型",
  sourceName: "Example Source",
  publishedAt: "2026年7月20日 09:00",
  relevanceScore: "88",
  sourceCount: 1,
  status: "已确认",
  factualSummary: "发生了一项可验证的更新。",
  whyItMatters: "它降低了产品接入成本。",
  underlyingLogic: null,
  productImpact: "团队可以更快完成集成。",
  productOpportunities: ["验证新的工作流。"],
  openQuestions: ["真实环境表现如何？"],
  matchedSignals: ["模型发布"],
  analysisProvider: "deepseek",
  analysisModel: "deepseek-v4-flash",
  evidence: [
    {
      sourceName: "Example Source",
      title: "Primary source",
      url: "https://example.com/source",
      publishedAt: "2026年7月20日 08:00",
      contentType: "模型",
      relevanceScore: "90",
      excerpt: "原始来源摘要。",
    },
  ],
};

describe("buildStoryMarkdown", () => {
  it("exports analysis and complete source metadata", () => {
    const markdown = buildStoryMarkdown(
      story,
      "https://navigator.test/stories/example-story",
    );

    expect(markdown).toContain('primary_source: "Example Source"');
    expect(markdown).toContain('url: "https://example.com/source"');
    expect(markdown).toContain("## 来源证据");
    expect(markdown).toContain("[Primary source](https://example.com/source)");
    expect(markdown).toContain("## 为什么重要");
    expect(markdown).not.toContain("## 底层逻辑");
  });
});
