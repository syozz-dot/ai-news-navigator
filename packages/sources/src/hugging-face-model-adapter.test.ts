import { describe, expect, it } from "vitest";

import { huggingFaceModelsSource } from "./definitions/hugging-face-models.js";
import { HuggingFaceModelAdapter } from "./hugging-face-model-adapter.js";

describe("HuggingFaceModelAdapter", () => {
  it("keeps recent notable original models and rejects derivative uploads", async () => {
    const candidates = [
      {
        id: "example/Standout-Model",
        author: "example",
        private: false,
        downloads: 150_000,
        likes: 420,
        trendingScore: 180,
        tags: ["transformers", "text-generation", "eval-results"],
        pipeline_tag: "text-generation",
        createdAt: "2026-07-15T00:00:00.000Z",
      },
      {
        id: "example/Standout-Model-GGUF",
        author: "example",
        private: false,
        downloads: 900_000,
        likes: 900,
        trendingScore: 500,
        tags: ["gguf", "base_model:quantized:example/Standout-Model"],
        pipeline_tag: "text-generation",
        createdAt: "2026-07-16T00:00:00.000Z",
      },
      {
        id: "example/Low-Signal-Model",
        author: "example",
        private: false,
        downloads: 100,
        likes: 4,
        trendingScore: 3,
        tags: ["transformers", "text-generation"],
        pipeline_tag: "text-generation",
        createdAt: "2026-07-16T00:00:00.000Z",
      },
    ];
    const adapter = new HuggingFaceModelAdapter({
      definition: huggingFaceModelsSource,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/api/models")) {
          return new Response(JSON.stringify(candidates), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          `---\nlicense: apache-2.0\n---\n# Standout Model\nA new reasoning model with benchmark results.`,
          { status: 200 },
        );
      },
    });

    const items = await adapter.fetch({
      now: new Date("2026-07-18T00:00:00.000Z"),
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: "hf-model:example/Standout-Model",
      contentType: "model",
      title: "Standout-Model",
      url: "https://huggingface.co/example/Standout-Model",
    });
    expect(items[0]?.excerpt).toContain("热度分 180");
    expect(items[0]?.excerpt).toContain("benchmark results");
  });

  it("fails clearly when the Hub response is unavailable", async () => {
    const adapter = new HuggingFaceModelAdapter({
      definition: huggingFaceModelsSource,
      fetchImpl: async () => new Response("unavailable", { status: 503 }),
    });

    await expect(
      adapter.fetch({ now: new Date("2026-07-18T00:00:00.000Z") }),
    ).rejects.toThrow("Hugging Face models request failed: 503");
  });
});
