import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { ArxivSourceAdapter } from "./arxiv-adapter.js";

const fixture = await readFile(
  new URL("./fixtures/arxiv-ai.xml", import.meta.url),
  "utf8",
);

describe("ArxivSourceAdapter", () => {
  it("maps paper metadata and preserves published separately from updated", async () => {
    const fetchImpl: typeof fetch = vi.fn(async (input) => {
      const url = new URL(input.toString());
      expect(url.searchParams.get("search_query")).toBe(
        "cat:cs.AI OR cat:cs.CL",
      );
      expect(url.searchParams.get("sortBy")).toBe("submittedDate");
      return Promise.resolve(new Response(fixture));
    });
    const adapter = new ArxivSourceAdapter({
      key: "arxiv:test",
      searchQuery: "cat:cs.AI OR cat:cs.CL",
      maxItems: 10,
      pageSize: 50,
      fetchImpl,
    });

    const items = await adapter.fetch({
      now: new Date("2026-07-16T04:00:00Z"),
      since: new Date("2026-07-10T00:00:00Z"),
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      externalId: "2607.14049v1",
      contentType: "paper",
      title: "Deep Interaction: An Efficient Human-AI Interaction Method",
      url: "https://arxiv.org/abs/2607.14049v1",
      author: "Hefeng Zhou, Jinxuan Zhang, Jiong Lou et al.",
      publishedAt: new Date("2026-07-15T17:16:43Z"),
      publicationTimeConfidence: "exact",
      metadata: {
        authors: ["Hefeng Zhou", "Jinxuan Zhang", "Jiong Lou", "Yuxin Liu"],
        categories: ["cs.AI", "cs.CL"],
        primaryCategory: "cs.AI",
        pdfUrl: "https://arxiv.org/pdf/2607.14049v1",
        updatedAt: "2026-07-15T18:00:00.000Z",
      },
    });
  });

  it("paginates politely and respects the configured item limit", async () => {
    const fetchImpl: typeof fetch = vi.fn(async (input) => {
      const start = new URL(input.toString()).searchParams.get("start") ?? "0";
      const version = start === "0" ? "2607.10000v1" : "2607.09999v1";
      const page = `<feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>http://arxiv.org/abs/${version}</id>
          <title>Paper at offset ${start}</title>
          <published>2026-07-15T12:00:00Z</published>
          <link href="https://arxiv.org/abs/${version}" rel="alternate" />
          <author><name>Example Author</name></author>
        </entry>
      </feed>`;
      return Promise.resolve(new Response(page));
    });
    const adapter = new ArxivSourceAdapter({
      key: "arxiv:test",
      searchQuery: "cat:cs.AI",
      maxItems: 2,
      pageSize: 1,
      maxPages: 2,
      requestIntervalMs: 0,
      fetchImpl,
    });

    const items = await adapter.fetch({
      now: new Date("2026-07-16T04:00:00Z"),
    });

    expect(items).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(
      new URL(String(vi.mocked(fetchImpl).mock.calls[1]?.[0])).searchParams.get(
        "start",
      ),
    ).toBe("1");
  });

  it("surfaces upstream failures", async () => {
    const adapter = new ArxivSourceAdapter({
      key: "arxiv:test",
      searchQuery: "cat:cs.AI",
      fetchImpl: vi.fn(async () =>
        Promise.resolve(new Response("busy", { status: 503 })),
      ),
    });

    await expect(
      adapter.fetch({ now: new Date("2026-07-16T04:00:00Z") }),
    ).rejects.toThrow("arXiv request failed with 503");
  });
});
