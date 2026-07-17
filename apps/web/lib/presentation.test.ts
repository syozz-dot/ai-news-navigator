import { describe, expect, it } from "vitest";

import {
  buildRuleDigest,
  buildRuleSignalNote,
  signalLabel,
} from "./presentation.js";

describe("Chinese rule presentation", () => {
  it("translates current deterministic signal identifiers", () => {
    expect(signalLabel("ai:agents")).toBe("智能体");
    expect(signalLabel("product:safety-policy")).toBe("安全与治理");
  });

  it("builds a factual Chinese digest without inventing impact", () => {
    expect(
      buildRuleDigest({
        contentType: "paper",
        sourceName: "arXiv AI",
        matchedSignals: ["ai:agents", "product:benchmark"],
        independentSourceCount: 1,
      }),
    ).toBe(
      "来自 arXiv AI 的一篇 AI 论文进入情报流。规则识别到「智能体、评测基准」等信号。当前由 1 个独立信源支持。",
    );
  });

  it("states that rule signals are not impact conclusions", () => {
    expect(buildRuleSignalNote(["product:performance"])).toContain(
      "不代替产品影响判断",
    );
  });
});
