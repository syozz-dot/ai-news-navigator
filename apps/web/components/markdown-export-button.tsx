"use client";

import { Check, FileMd } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import {
  buildStoryMarkdown,
  type StoryMarkdownInput,
} from "../lib/story-markdown";

export function MarkdownExportButton({ story }: { story: StoryMarkdownInput }) {
  const [exported, setExported] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  function downloadMarkdown() {
    const markdown = buildStoryMarkdown(story, window.location.href);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${story.slug}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setExported(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setExported(false), 1_800);
  }

  return (
    <button
      className="favoriteButton markdownExportButton"
      type="button"
      aria-label="将这篇 Story 导出为 Markdown"
      title="导出 Markdown"
      onClick={downloadMarkdown}
    >
      {exported ? (
        <Check aria-hidden="true" size={18} weight="bold" />
      ) : (
        <FileMd aria-hidden="true" size={18} weight="regular" />
      )}
      <span>{exported ? "已导出" : "导出 MD"}</span>
    </button>
  );
}
