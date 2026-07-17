"use client";

import { BookmarkSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_STORAGE_KEY,
  readFavorites,
} from "../lib/favorites";

export function FavoritesHeaderLink() {
  const [count, setCount] = useState<number | null>(null);

  const syncCount = useCallback(() => {
    setCount(readFavorites(window.localStorage).length);
  }, []);

  useEffect(() => {
    syncCount();

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === FAVORITES_STORAGE_KEY) syncCount();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncCount);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncCount);
    };
  }, [syncCount]);

  const label = count ? `查看收藏，共 ${count} 条` : "查看收藏";

  return (
    <Link
      className="iconButton favoritesHeaderLink"
      href="/favorites"
      aria-label={label}
      title={label}
    >
      <BookmarkSimple
        aria-hidden="true"
        size={18}
        weight={count ? "fill" : "regular"}
      />
      {count ? <span className="favoritesCount">{count}</span> : null}
    </Link>
  );
}
