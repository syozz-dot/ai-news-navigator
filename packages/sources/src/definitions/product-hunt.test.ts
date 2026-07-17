import { describe, expect, it, vi } from "vitest";

import { createProductHuntAdapter, productHuntSource } from "./product-hunt.js";

const feed = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <id>tag:www.producthunt.com,2005:Post/1198643</id>
      <published>2026-07-16T19:39:47-07:00</published>
      <link rel="alternate" type="text/html" href="https://www.producthunt.com/products/kimi-ai-assistant" />
      <title>Kimi K3</title>
      <content type="html">&lt;p&gt;The world's first open 3T-class model&lt;/p&gt;</content>
      <author><name>Zac Zuo</name></author>
    </entry>
  </feed>`;

describe("Product Hunt source", () => {
  it("maps product launches from the official Atom feed", async () => {
    const adapter = createProductHuntAdapter(
      vi.fn(async () =>
        Promise.resolve(
          new Response(feed, {
            status: 200,
            headers: { "content-type": "application/atom+xml" },
          }),
        ),
      ),
    );

    const items = await adapter.fetch({
      now: new Date("2026-07-17T08:00:00Z"),
    });

    expect(productHuntSource.type).toBe("product_hunt");
    expect(items).toEqual([
      expect.objectContaining({
        externalId: "tag:www.producthunt.com,2005:Post/1198643",
        contentType: "product",
        title: "Kimi K3",
        excerpt: "The world's first open 3T-class model",
        url: "https://www.producthunt.com/products/kimi-ai-assistant",
        author: "Zac Zuo",
        publishedAt: new Date("2026-07-17T02:39:47.000Z"),
      }),
    ]);
  });
});
