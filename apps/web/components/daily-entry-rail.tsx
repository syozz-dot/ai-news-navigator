import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { DailyIssue } from "../lib/queries";

function shortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export function DailyEntryRail({ issue }: { issue: DailyIssue }) {
  return (
    <aside className="dailyEntryRail" aria-labelledby="daily-entry-title">
      <section className="dailyEntryCard">
        <div className="dailyEntryEdition">
          <span>AI NEWS NAVIGATOR</span>
          <span>DAILY</span>
        </div>
        <p className="dailyEntryDate">{shortDate(issue.issueDate)}</p>
        <h2 id="daily-entry-title">把今天的 AI 进展一次读完</h2>
        <p className="dailyEntryMeta">
          {issue.total > 0
            ? `${issue.total} 条重点 · 约 ${issue.readingMinutes} 分钟`
            : "本期中文解读正在生成"}
        </p>
        {issue.items.length > 0 ? (
          <ol className="dailyEntryHighlights">
            {issue.items.slice(0, 3).map((story) => (
              <li key={story.id}>{story.translatedTitle ?? story.title}</li>
            ))}
          </ol>
        ) : null}
        <Link
          className="dailyEntryLink"
          href={`/daily?date=${issue.issueDate}`}
        >
          阅读本期日报
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>
    </aside>
  );
}
