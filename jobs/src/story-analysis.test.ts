import { afterEach, describe, expect, it } from "vitest";

import {
  createConfiguredStoryAnalyzer,
  DEFAULT_GATEWAY_STORY_ANALYSIS_MODEL,
  DEFAULT_STORY_ANALYSIS_MODEL,
  OpenAIStoryAnalyzer,
  VercelGatewayStoryAnalyzer,
} from "./story-analysis.js";

const originalOpenAIKey = process.env.OPENAI_API_KEY;
const originalOpenAIModel = process.env.OPENAI_MODEL;
const originalGatewayKey = process.env.AI_GATEWAY_API_KEY;
const originalOidcToken = process.env.VERCEL_OIDC_TOKEN;
const originalModel = process.env.AI_GATEWAY_MODEL;

afterEach(() => {
  restoreEnvironment("OPENAI_API_KEY", originalOpenAIKey);
  restoreEnvironment("OPENAI_MODEL", originalOpenAIModel);
  restoreEnvironment("AI_GATEWAY_API_KEY", originalGatewayKey);
  restoreEnvironment("VERCEL_OIDC_TOKEN", originalOidcToken);
  restoreEnvironment("AI_GATEWAY_MODEL", originalModel);
});

describe("Story analysis configuration", () => {
  it("stays disabled locally when no Gateway identity is available", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;

    expect(createConfiguredStoryAnalyzer()).toBeNull();
  });

  it("uses the deployment identity and supports a model override", () => {
    delete process.env.OPENAI_API_KEY;
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

  it("prefers a direct OpenAI key and supports a model override", () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "test-nano-model";

    const analyzer = createConfiguredStoryAnalyzer({
      authorizationToken: "test-oidc-token",
    });

    expect(analyzer).toBeInstanceOf(OpenAIStoryAnalyzer);
    expect((analyzer as OpenAIStoryAnalyzer).model).toBe("test-nano-model");
  });

  it("defaults direct OpenAI analysis to GPT-5 nano", () => {
    delete process.env.OPENAI_MODEL;

    const analyzer = createConfiguredStoryAnalyzer({
      openAIApiKey: "test-openai-key",
    });

    expect((analyzer as OpenAIStoryAnalyzer).model).toBe(
      DEFAULT_STORY_ANALYSIS_MODEL,
    );
  });

  it("defaults Gateway analysis to the OpenAI-qualified model", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_GATEWAY_MODEL;

    const analyzer = createConfiguredStoryAnalyzer({
      authorizationToken: "test-oidc-token",
    });

    expect((analyzer as VercelGatewayStoryAnalyzer).model).toBe(
      DEFAULT_GATEWAY_STORY_ANALYSIS_MODEL,
    );
  });
});

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
