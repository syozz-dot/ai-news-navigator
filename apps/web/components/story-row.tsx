import {
  ArrowRight,
  CheckCircle,
  Circle,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { StoryFeedItem } from "../lib/queries";
import {
  buildRuleDigest,
  contentTypeLabels,
  formatDateTime,
  formatScore,
  signalLabel,
  storyStatusLabels,
} from "../lib/presentation";

export function StoryRow({
  story,
  index,
  lead = false,
  displayScore,
  scoreLabel = "相关度",
  detailHref,
}: {
  story: StoryFeedItem;
  index: number;
  lead?: boolean;
  displayScore?: number | null;
  scoreLabel?: string;
  detailHref?: string;
}) {
  const score = displayScore ?? story.overallScore ?? story.relevanceScore;
  const href = detailHref ?? `/stories/${story.slug}`;
  const implication = story.whyItMatters;
  const ruleDigest = buildRuleDigest(story);
  const displayTitle = story.translatedTitle ?? story.title;

  return (
    <article className={lead ? "storyRow lead" : "storyRow"}>
      <div className="storyIndex" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="storyMetaCells">
        <strong className="storySource">
          {story.sourceName ?? "未知信源"}
        </strong>
        <span className="storyType">
          {story.contentType ? contentTypeLabels[story.contentType] : "情报"}
        </span>
        <time
          className="storyTime"
          dateTime={story.lastPublishedAt?.toISOString()}
        >
          {formatDateTime(story.lastPublishedAt)}
        </time>
      </div>
      <div className="storyHeadline">
        <Link className="storyTitleLink" href={href}>
          <h2>{displayTitle}</h2>
        </Link>
        <div className="storySignals" aria-label="内容信号">
          {story.topics.slice(0, 2).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
          {story.matchedSignals.slice(0, 3).map((signal) => (
            <span key={signal}>{signalLabel(signal)}</span>
          ))}
          <span>{story.independentSourceCount} 个独立信源</span>
        </div>
      </div>
      <div className="storyDistill">
        {implication ? <p>{implication}</p> : <p>{ruleDigest}</p>}
        <div className="storyEvidenceState">
          {story.status === "confirmed" ? (
            <CheckCircle aria-hidden="true" size={16} weight="fill" />
          ) : (
            <Circle aria-hidden="true" size={15} />
          )}
          <span>{storyStatusLabels[story.status]}</span>
          <span
            className={
              story.hasAnalysis ? "analysisState ready" : "analysisState"
            }
          >
            {story.hasAnalysis ? "中文分析已生成" : "原文与规则导读"}
          </span>
        </div>
      </div>
      <Link
        className="storyScoreLink"
        href={href}
        aria-label={`阅读 ${displayTitle}，${scoreLabel} ${formatScore(score)}`}
      >
        <span>{formatScore(score)}</span>
        <ArrowRight aria-hidden="true" size={18} weight="regular" />
      </Link>
    </article>
  );
}
