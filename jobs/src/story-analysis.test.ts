import { afterEach, describe, expect, it } from "vitest";

import {
  createConfiguredStoryAnalyzer,
  DEFAULT_STORY_ANALYSIS_MODEL,
  VercelGatewayStoryAnalyzer,
} from "./story-analysis.js";

const originalGatewayKey = process.env.AI_GATEWAY_API_KEY;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalModel = process.env.AI_GATEWAY_MODEL;

afterEach(() => {
  restoreEnvironment("AI_GATEWAY_API_KEY", originalGatewayKey);
  restoreEnvironment("VERCEL_OIDC_TOKEN", originalOidcToken);
  restoreEnvironment("AI_GATEWAY_MODEL", originalModel);
});

describe("Story analysis configuration", () => {
  it("stays disabled locally when no Gateway identity is available", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;

    expect(createConfiguredStoryAnalyzer()).toBeNull();
  });

  it("uses the deployment identity and supports a model override", () => {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    process.env.AI_GATEWAY_MODEL = "test/cheap-model";

    const analyzer = createConfiguredStoryAnalyzer({
      authorizationToken: "test-oidc-token",
    });

    expect(analyzer).toBeInstanceOf(VercelGatewayStoryAnalyzer);
    expect((analyzer as VercelGatewayStoryAnalyzer).model).toBe(
      "test/cheap-model",
    );
  });

  it("defaults to the low-cost Chinese-capable model", () => {
    delete process.env.AI_GATEWAY_MODEL;

    const analyzer = createConfiguredStoryAnalyzer({
      authorizationToken: "test-oidc-token",
    });

    expect((analyzer as VercelGatewayStoryAnalyzer).model).toBe(
      DEFAULT_STORY_ANALYSIS_MODEL,
    );
  });
});

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
