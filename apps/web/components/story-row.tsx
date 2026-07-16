import {
  ArrowRight,
  CheckCircle,
  Circle,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { StoryFeedItem } from "../lib/queries";
import {
  contentTypeLabels,
  formatDateTime,
  formatScore,
  signalLabel,
  storyStatusLabels,
} from "../lib/presentation";

export function StoryRow({
  story,
  index,
}: {
  story: StoryFeedItem;
  index: number;
}) {
  const score = story.overallScore ?? story.relevanceScore;
  const summary = story.factualSummary ?? story.excerpt;

  return (
    <article className="storyRow">
      <div className="storyIndex" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="storyCore">
        <div className="storyMeta">
          <span>
            {story.contentType ? contentTypeLabels[story.contentType] : "情报"}
          </span>
          <span>{story.sourceName ?? "未知信源"}</span>
          <span>{formatDateTime(story.lastPublishedAt)}</span>
        </div>
        <Link className="storyTitleLink" href={`/stories/${story.slug}`}>
          <h2>{story.title}</h2>
          <ArrowRight aria-hidden="true" size={20} weight="regular" />
        </Link>
        {summary ? <p className="storySummary">{summary}</p> : null}
        <div className="storySignals" aria-label="内容信号">
          {story.topics.slice(0, 2).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
          {story.matchedSignals.slice(0, 3).map((signal) => (
            <span key={signal}>{signalLabel(signal)}</span>
          ))}
        </div>
      </div>
      <div className="storyAssessment">
        <div className="scoreBlock">
          <span className="scoreValue">{formatScore(score)}</span>
          <span className="scoreLabel">相关度</span>
        </div>
        <div className="storyStatus">
          {story.status === "confirmed" ? (
            <CheckCircle aria-hidden="true" size={16} weight="fill" />
          ) : (
            <Circle aria-hidden="true" size={15} />
          )}
          <span>{storyStatusLabels[story.status]}</span>
        </div>
        <span className="evidenceCount">
          {story.independentSourceCount} 个独立信源
        </span>
        <span
          className={
            story.hasAnalysis ? "analysisState ready" : "analysisState"
          }
        >
          {story.hasAnalysis ? "分析已生成" : "分析待生成"}
        </span>
      </div>
    </article>
  );
}
