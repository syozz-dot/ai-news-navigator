import { describe, expect, it, vi } from "vitest";

import type { SourceAdapter } from "@ai-news-navigator/sources";

import {
  runIngestion,
  type IngestionLogger,
  type IngestionRepository,
} from "./ingestion.js";
import type { NormalizedItem } from "./normalize.js";

describe("runIngestion", () => {
  it("runs fetch, normalization, exact deduplication, and storage", async () => {
    const adapter: SourceAdapter = {
      key: "test-rss",
      async fetch() {
        return [
          {
            contentType: "news",
            title: "Model launch",
            url: "https://example.com/launch?utm_source=x",
          },
          {
            contentType: "news",
            title: "Model launch duplicate",
            url: "https://example.com/launch?utm_source=y",
          },
        ];
      },
    };

    const storedItems: NormalizedItem[] = [];
    const repository: IngestionRepository = {
      async startSourceRun() {
        return "run-1";
      },
      async upsertItem(item) {
        storedItems.push(item);
        return { id: "item-1", created: true };
      },
      finishSourceRun: vi.fn(async () => undefined),
    };
    const logger: IngestionLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const result = await runIngestion({
      sourceId: "source-1",
      adapter,
      repository,
      logger,
      now: () => new Date("2026-07-16T08:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "succeeded",
      fetchedCount: 2,
      storedCount: 1,
      duplicateCount: 1,
      failedCount: 0,
      errorMessage: null,
    });
    expect(storedItems).toHaveLength(1);
    expect(storedItems[0]?.canonicalUrl).toBe("https://example.com/launch");
    expect(repository.finishSourceRun).toHaveBeenCalledOnce();
  });
});
