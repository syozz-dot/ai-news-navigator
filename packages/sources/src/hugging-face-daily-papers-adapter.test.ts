import { describe, expect, it, vi } from "vitest";

import { huggingFaceDailyPapersSource } from "./definitions/hugging-face-daily-papers.js";
import { HuggingFaceDailyPapersAdapter } from "./hugging-face-daily-papers-adapter.js";

describe("HuggingFaceDailyPapersAdapter", () => {
  it("maps community-selected papers using their Daily Papers publication time", async () => {
    const payload = [
      {
        paper: {
          id: "2607.14088",
          title: "VideoRAE",
          summary: "A representation autoencoder for video generation.",
          authors: [{ name: "Zhihao Xie" }, { name: "Junfeng Wu" }],
          publishedAt: "2026-07-15T00:00:00.000Z",
          submittedOnDailyAt: "2026-07-20T00:00:00.000Z",
          upvotes: 42,
          projectPage: "https://example.com/videorae",
          githubRepo: "https://github.com/example/videorae",
        },
        numComments: 3,
      },
    ];
    const adapter = new HuggingFaceDailyPapersAdapter({
      definition: huggingFaceDailyPapersSource,
      fetchImpl: vi.fn(
        async () =>
          new Response(JSON.stringify(payload), {
            headers: { "content-type": "application/json" },
          }),
      ),
    });

    const items = await adapter.fetch({
      now: new Date("2026-07-20T04:00:00.000Z"),
    });

    expect(items).toEqual([
      expect.objectContaining({
        externalId: "hf-paper:2607.14088",
        contentType: "paper",
        title: "VideoRAE",
        excerpt: "A representation autoencoder for video generation.",
        author: "Zhihao Xie, Junfeng Wu",
        url: "https://huggingface.co/papers/2607.14088",
        publishedAt: new Date("2026-07-20T00:00:00.000Z"),
        metadata: expect.objectContaining({
          upvotes: 42,
          comments: 3,
          originalPublishedAt: "2026-07-15T00:00:00.000Z",
        }),
      }),
    ]);
  });

  it("surfaces Hub API failures", async () => {
    const adapter = new HuggingFaceDailyPapersAdapter({
      definition: huggingFaceDailyPapersSource,
      fetchImpl: vi.fn(
        async () => new Response("unavailable", { status: 503 }),
      ),
    });

    await expect(
      adapter.fetch({ now: new Date("2026-07-20T04:00:00.000Z") }),
    ).rejects.toThrow("Daily Papers request failed: 503");
  });
});
