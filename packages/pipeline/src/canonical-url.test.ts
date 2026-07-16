import { describe, expect, it } from "vitest";

import { canonicalizeUrl, InvalidUrlError } from "./canonical-url.js";

describe("canonicalizeUrl", () => {
  it("removes fragments, tracking parameters, and trailing slashes", () => {
    expect(
      canonicalizeUrl(
        "https://Example.com/news/launch/?utm_source=x&b=2&a=1#details",
      ),
    ).toBe("https://example.com/news/launch?a=1&b=2");
  });

  it("keeps product parameters while removing campaign parameters", () => {
    expect(
      canonicalizeUrl(
        "https://example.com/article?id=42&gclid=ignored&lang=zh-CN",
      ),
    ).toBe("https://example.com/article?id=42&lang=zh-CN");
  });

  it("rejects non-http protocols", () => {
    expect(() => canonicalizeUrl("file:///tmp/article.html")).toThrow(
      InvalidUrlError,
    );
  });
});
