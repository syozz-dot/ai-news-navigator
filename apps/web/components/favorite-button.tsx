"use client";

import { BookmarkSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import {
  addFavorite,
  FAVORITES_CHANGED_EVENT,
  FAVORITES_STORAGE_KEY,
  notifyFavoritesChanged,
  readFavorites,
  removeFavorite,
  writeFavorites,
  type FavoriteStoryInput,
} from "../lib/favorites";

export function FavoriteButton({ story }: { story: FavoriteStoryInput }) {
  const [saved, setSaved] = useState(false);

  const syncSavedState = useCallback(() => {
    setSaved(
      readFavorites(window.localStorage).some(
        (favorite) => favorite.slug === story.slug,
      ),
    );
  }, [story.slug]);

  useEffect(() => {
    syncSavedState();

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === FAVORITES_STORAGE_KEY) syncSavedState();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncSavedState);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncSavedState);
    };
  }, [syncSavedState]);

  function toggleFavorite() {
    const favorites = readFavorites(window.localStorage);
    const next = saved
      ? removeFavorite(favorites, story.slug)
      : addFavorite(favorites, story);
    writeFavorites(window.localStorage, next);
    setSaved(!saved);
    notifyFavoritesChanged();
  }

  return (
    <button
      className="favoriteButton"
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "取消收藏这篇 Story" : "收藏这篇 Story"}
      title={saved ? "取消收藏" : "收藏"}
      onClick={toggleFavorite}
    >
      <BookmarkSimple
        aria-hidden="true"
        size={18}
        weight={saved ? "fill" : "regular"}
      />
      <span>{saved ? "已收藏" : "收藏"}</span>
    </button>
  );
}
