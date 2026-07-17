import { describe, expect, it } from "vitest";

import {
  addFavorite,
  FAVORITES_STORAGE_KEY,
  readFavorites,
  removeFavorite,
  writeFavorites,
  type FavoriteStoryInput,
} from "./favorites.js";

function createStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: (key: string) => (key === FAVORITES_STORAGE_KEY ? value : null),
    setItem: (key: string, nextValue: string) => {
      if (key === FAVORITES_STORAGE_KEY) value = nextValue;
    },
  };
}

const story: FavoriteStoryInput = {
  slug: "inkling-example",
  title: "Inkling 中文解读",
  originalTitle: "Inkling",
  summary: "一条可读的中文摘要。",
  contentType: "模型",
  sourceName: "Hugging Face Model Radar",
  publishedAt: "2026-07-14T13:23:14.000Z",
  score: 0.94,
};

describe("browser favorites", () => {
  it("adds, persists and removes a favorite", () => {
    const storage = createStorage();
    const added = addFavorite([], story, "2026-07-18T00:00:00.000Z");
    writeFavorites(storage, added);

    expect(readFavorites(storage)).toEqual(added);
    expect(removeFavorite(added, story.slug)).toEqual([]);
  });

  it("recovers from invalid browser storage", () => {
    expect(readFavorites(createStorage("not-json"))).toEqual([]);
    expect(readFavorites(createStorage('{"unexpected":true}'))).toEqual([]);
  });

  it("moves an existing story to the front without duplicating it", () => {
    const first = addFavorite([], story, "2026-07-17T00:00:00.000Z");
    const updated = addFavorite(first, story, "2026-07-18T00:00:00.000Z");

    expect(updated).toHaveLength(1);
    expect(updated[0]?.savedAt).toBe("2026-07-18T00:00:00.000Z");
  });
});
