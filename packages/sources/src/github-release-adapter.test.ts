import { describe, expect, it, vi } from "vitest";

import {
  createGitHubReleaseAdapter,
  createGitHubReleaseSourceDefinition,
  type GitHubReleaseProject,
} from "./github-release-adapter.js";

const project = {
  owner: "example",
  repository: "ai-runtime",
  displayName: "AI Runtime",
} satisfies GitHubReleaseProject;

const feed = `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <id>tag:github.com,2008:Repository/1/v2.0.0-rc1</id>
      <updated>2026-07-16T03:30:00Z</updated>
      <link rel="alternate" href="https://github.com/example/ai-runtime/releases/tag/v2.0.0-rc1" />
      <title>v2.0.0</title>
      <content type="html">&lt;p&gt;Release candidate&lt;/p&gt;</content>
    </entry>
    <entry>
      <id>tag:github.com,2008:Repository/1/v1.9.0</id>
      <updated>2026-07-15T03:30:00Z</updated>
      <link rel="alternate" href="https://github.com/example/ai-runtime/releases/tag/v1.9.0" />
      <title>v1.9.0</title>
      <content type="html">&lt;h2&gt;Highlights&lt;/h2&gt;&lt;p&gt;Faster inference and safer tool calls.&lt;/p&gt;</content>
      <author><name>release-bot</name></author>
    </entry>
  </feed>`;

describe("GitHubReleaseAdapter", () => {
  it("keeps stable releases and treats Atom updated time as inferred", async () => {
    const definition = createGitHubReleaseSourceDefinition(project);
    const adapter = createGitHubReleaseAdapter(
      project,
      definition,
      vi.fn(async () => Promise.resolve(new Response(feed))),
    );

    const items = await adapter.fetch({
      now: new Date("2026-07-16T04:00:00Z"),
    });

    expect(adapter.key).toBe("github-releases:example/ai-runtime");
    expect(items).toEqual([
      expect.objectContaining({
        contentType: "release",
        title: "AI Runtime v1.9.0",
        excerpt: "Highlights Faster inference and safer tool calls.",
        author: "release-bot",
        publishedAt: new Date("2026-07-15T03:30:00Z"),
        publicationTimeConfidence: "inferred",
        metadata: expect.objectContaining({
          repository: "example/ai-runtime",
          releaseChannel: "stable",
        }),
      }),
    ]);
  });
});
