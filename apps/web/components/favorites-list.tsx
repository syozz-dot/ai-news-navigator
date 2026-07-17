"use client";

import { ArrowRight, BookmarkSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_STORAGE_KEY,
  notifyFavoritesChanged,
  readFavorites,
  removeFavorite,
  writeFavorites,
  type FavoriteStory,
} from "../lib/favorites";
import { formatScore } from "../lib/presentation";

function formatStoredDate(value: string | null) {
  if (!value) return "时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function FavoritesList() {
  const [favorites, setFavorites] = useState<FavoriteStory[] | null>(null);

  const syncFavorites = useCallback(() => {
    setFavorites(readFavorites(window.localStorage));
  }, []);

  useEffect(() => {
    syncFavorites();

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key === FAVORITES_STORAGE_KEY) syncFavorites();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites);
    };
  }, [syncFavorites]);

  function remove(slug: string) {
    const next = removeFavorite(readFavorites(window.localStorage), slug);
    writeFavorites(window.localStorage, next);
    setFavorites(next);
    notifyFavoritesChanged();
  }

  if (favorites === null) {
    return (
      <div className="favoritesLoading" aria-label="正在读取收藏">
        <span />
        <span />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <section className="favoritesEmpty">
        <BookmarkSimple aria-hidden="true" size={28} />
        <h2>还没有收藏内容</h2>
        <p>打开一篇 Story，点击标题上方的收藏按钮即可保存在这里。</p>
        <Link href="/">
          返回情报流
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>
    );
  }

  return (
    <section className="favoritesCollection" aria-label="已收藏 Story">
      {favorites.map((story, index) => (
        <article className="favoriteRow" key={story.slug}>
          <div className="favoriteRowIndex" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </div>
          <div className="favoriteRowContent">
            <div className="favoriteRowMeta">
              <span>{story.contentType}</span>
              <span>{story.sourceName}</span>
              <span>{formatStoredDate(story.publishedAt)}</span>
            </div>
            <Link href={`/stories/${story.slug}`}>
              <h2>{story.title}</h2>
              {story.summary ? <p>{story.summary}</p> : null}
            </Link>
          </div>
          <div className="favoriteRowActions">
            <span className="favoriteRowScore">{formatScore(story.score)}</span>
            <button
              type="button"
              onClick={() => remove(story.slug)}
              aria-label={`取消收藏 ${story.title}`}
              title="取消收藏"
            >
              <BookmarkSimple aria-hidden="true" size={18} weight="fill" />
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
