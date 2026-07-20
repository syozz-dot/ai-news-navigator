import { describe, expect, it, vi } from "vitest";

import { anthropicNewsSource } from "./definitions/anthropic-news.js";
import { AnthropicNewsAdapter } from "./anthropic-news-adapter.js";

const newsroom = `<!doctype html><html><body>
  <a href="/news/claude-example" class="FeaturedGrid-module__sideLink">
    <h2>Introducing Claude &amp; Tools</h2>
    <p>Claude can now complete longer coding tasks.</p>
  </a>
  <ul class="PublicationList-module__list">
    <li><a href="/news/claude-example" class="PublicationList-module__listItem">
      <div><time class="PublicationList-module__date">Jul 19, 2026</time>
      <span class="PublicationList-module__subject">Product</span></div>
      <span class="PublicationList-module__title">Introducing Claude &amp; Tools</span>
    </a></li>
    <li><a href="/news/older-example" class="PublicationList-module__listItem">
      <div><time class="PublicationList-module__date">Jul 10, 2026</time>
      <span class="PublicationList-module__subject">Announcements</span></div>
      <span class="PublicationList-module__title">Older update</span>
    </a></li>
  </ul>
</body></html>`;

describe("AnthropicNewsAdapter", () => {
  it("maps official Newsroom entries and respects the source cursor", async () => {
    const adapter = new AnthropicNewsAdapter({
      definition: anthropicNewsSource,
      fetchImpl: vi.fn(async () => new Response(newsroom, { status: 200 })),
    });

    const items = await adapter.fetch({
      now: new Date("2026-07-20T00:00:00.000Z"),
      since: new Date("2026-07-15T00:00:00.000Z"),
    });

    expect(items).toEqual([
      expect.objectContaining({
        externalId: "anthropic-news:claude-example",
        contentType: "news",
        title: "Introducing Claude & Tools",
        excerpt: "Claude can now complete longer coding tasks.",
        url: "https://www.anthropic.com/news/claude-example",
        author: "Anthropic",
        publishedAt: new Date("2026-07-19T00:00:00.000Z"),
        metadata: expect.objectContaining({ category: "Product" }),
      }),
    ]);
  });

  it("fails clearly when the Newsroom markup is unavailable", async () => {
    const adapter = new AnthropicNewsAdapter({
      definition: anthropicNewsSource,
      fetchImpl: vi.fn(async () => new Response("<html></html>")),
    });

    await expect(
      adapter.fetch({ now: new Date("2026-07-20T00:00:00.000Z") }),
    ).rejects.toThrow("did not contain publication entries");
  });
});
