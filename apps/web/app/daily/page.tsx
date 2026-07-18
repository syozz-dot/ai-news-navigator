import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { contentTypeLabels, formatScore } from "../../lib/presentation";
import {
  getDailyIssue,
  type ContentType,
  type DailyIssue,
  type StoryFeedItem,
} from "../../lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 日报",
  description:
    "把当天最值得关注的 AI 新闻、论文、产品和模型浓缩成一份中文日报。",
};

const dailySections: Array<{
  type: Extract<ContentType, "news" | "paper" | "product" | "model">;
  label: string;
  englishLabel: string;
}> = [
  { type: "model", label: "模型进展", englishLabel: "MODEL RADAR" },
  { type: "product", label: "产品与商业", englishLabel: "PRODUCT" },
  { type: "news", label: "行业动态", englishLabel: "INDUSTRY" },
  { type: "paper", label: "论文研究", englishLabel: "RESEARCH" },
];

function formatIssueDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function itemsForSection(
  issue: DailyIssue,
  type: ContentType,
): StoryFeedItem[] {
  return issue.items.filter((item) => item.contentType === type);
}

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  if (!process.env.DATABASE_URL) return <DailyUnavailable />;

  const { date } = await searchParams;
  const issue = await getDailyIssue(date);
  const highlights = issue.items.slice(0, 5);

  return (
    <main className="dailyPage">
      <div className="dailyIssueShell">
        <header className="dailyIssueHeader">
          <div className="dailyIssueEyebrow">
            <span>AI NEWS NAVIGATOR</span>
            <span>DAILY · {issue.issueDate.replaceAll("-", ".")}</span>
          </div>
          <div className="dailyIssueTitleRow">
            <div>
              <p>{formatIssueDate(issue.issueDate)}</p>
              <h1>AI 日报</h1>
            </div>
            <dl className="dailyIssueSummary">
              <div>
                <dt>今日重点</dt>
                <dd>{issue.total}</dd>
              </div>
              <div>
                <dt>预计阅读</dt>
                <dd>{issue.readingMinutes} 分钟</dd>
              </div>
            </dl>
          </div>
        </header>

        {issue.total > 0 ? (
          <>
            <nav className="dailyContents" aria-label="本期目录">
              <span>本期目录</span>
              {dailySections
                .filter((section) => issue.counts[section.type] > 0)
                .map((section, index) => (
                  <a key={section.type} href={`#daily-${section.type}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {section.label}
                    <small>{issue.counts[section.type]}</small>
                  </a>
                ))}
            </nav>

            <section
              className="dailyHighlights"
              aria-labelledby="highlights-title"
            >
              <div className="dailySectionHeading">
                <span>00</span>
                <div>
                  <p>TODAY&apos;S HIGHLIGHTS</p>
                  <h2 id="highlights-title">今日看点</h2>
                </div>
              </div>
              <ol>
                {highlights.map((story, index) => (
                  <li key={story.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <Link href={`/stories/${story.slug}`}>
                      {story.translatedTitle ?? story.title}
                    </Link>
                    <small>
                      {story.contentType
                        ? contentTypeLabels[story.contentType]
                        : "情报"}
                    </small>
                  </li>
                ))}
              </ol>
            </section>

            <div className="dailySections">
              {dailySections.map((section, sectionIndex) => {
                const sectionItems = itemsForSection(issue, section.type);
                if (sectionItems.length === 0) return null;
                return (
                  <section
                    className="dailySection"
                    id={`daily-${section.type}`}
                    key={section.type}
                  >
                    <div className="dailySectionHeading">
                      <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                      <div>
                        <p>{section.englishLabel}</p>
                        <h2>{section.label}</h2>
                      </div>
                      <strong>{sectionItems.length} 条</strong>
                    </div>
                    <div className="dailyStoryList">
                      {sectionItems.map((story) => (
                        <article className="dailyStory" key={story.id}>
                          <div className="dailyStoryMeta">
                            <span>{story.sourceName ?? "未知信源"}</span>
                            <span>
                              {formatScore(
                                story.overallScore ?? story.relevanceScore,
                              )}
                            </span>
                          </div>
                          <h3>
                            <Link href={`/stories/${story.slug}`}>
                              {story.translatedTitle ?? story.title}
                            </Link>
                          </h3>
                          <p>{story.factualSummary}</p>
                          {story.whyItMatters ? (
                            <div className="dailyWhy">
                              <strong>为什么值得看</strong>
                              <span>{story.whyItMatters}</span>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <section className="dailyEmpty">
            <p>本期日报正在整理</p>
            <h2>中文解读生成后会自动汇入这里。</h2>
            <Link href="/">先返回情报流</Link>
          </section>
        )}

        <nav className="dailyDateNav" aria-label="日报日期导航">
          {issue.previousDate ? (
            <Link href={`/daily?date=${issue.previousDate}`}>
              <ArrowLeft aria-hidden="true" size={16} />
              前一日
            </Link>
          ) : (
            <span />
          )}
          <Link href="/">返回情报流</Link>
          {issue.nextDate ? (
            <Link href={`/daily?date=${issue.nextDate}`}>
              后一日
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </main>
  );
}

function DailyUnavailable() {
  return (
    <main className="dailyPage">
      <section className="dailyEmpty standalone">
        <p>需要完成一次本地配置</p>
        <h1>连接数据库后，日报会自动生成。</h1>
        <Link href="/">返回首页</Link>
      </section>
    </main>
  );
}
