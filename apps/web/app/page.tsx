import { ArrowDown, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { EmptyFeed } from "../components/empty-feed";
import { StoryRow } from "../components/story-row";
import { contentTypeLabels, formatCalendarDate } from "../lib/presentation";
import { getDailyIssue, getStoryFeed, type ContentType } from "../lib/queries";

export const dynamic = "force-dynamic";

const filters: Array<{ label: string; value?: ContentType }> = [
  { label: "全部" },
  { label: "新闻", value: "news" },
  { label: "论文", value: "paper" },
  { label: "产品", value: "product" },
  { label: "模型", value: "model" },
];

function parseContentType(value: string | undefined): ContentType | undefined {
  const allowed: ContentType[] = [
    "news",
    "paper",
    "product",
    "model",
    "release",
    "post",
    "other",
  ];
  return value && allowed.includes(value as ContentType)
    ? (value as ContentType)
    : undefined;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  if (!process.env.DATABASE_URL) return <DatabaseSetupState />;

  const { type } = await searchParams;
  const activeType = parseContentType(type);
  const [{ items, total }, dailyIssue] = await Promise.all([
    getStoryFeed(activeType),
    getDailyIssue(),
  ]);
  const focusStory = items[0];
  const focusSummary =
    focusStory?.factualSummary ??
    (focusStory
      ? "中文解读尚未生成。规则信号只用于筛选，不代替事实摘要或产品判断。"
      : "今日焦点正在等待第一条可验证的 Story。");
  const focusTitle = focusStory?.translatedTitle ?? focusStory?.title;

  return (
    <main>
      <section className="dailyBrief" aria-labelledby="brief-title">
        <div className="briefLead">
          <div className="introDate">{formatCalendarDate()}</div>
          <h1 id="brief-title">今日 AI 简报</h1>
          <div className="briefMonogram" aria-hidden="true">
            <span />N<span />
          </div>
          <p>先看今天发生了什么，再理解它对产品和业务的影响。</p>
          <aside
            className="briefOverview"
            aria-labelledby="brief-overview-title"
          >
            <div className="briefOverviewHeader">
              <h2 id="brief-overview-title">今日概览</h2>
              <strong>{dailyIssue.total}</strong>
            </div>
            <dl>
              <div>
                <dt>新闻</dt>
                <dd>{dailyIssue.counts.news}</dd>
              </div>
              <div>
                <dt>论文</dt>
                <dd>{dailyIssue.counts.paper}</dd>
              </div>
              <div>
                <dt>产品</dt>
                <dd>{dailyIssue.counts.product}</dd>
              </div>
              <div>
                <dt>模型</dt>
                <dd>{dailyIssue.counts.model}</dd>
              </div>
            </dl>
            <Link href={`/daily?date=${dailyIssue.issueDate}`}>
              阅读今日日报
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </aside>
        </div>

        {focusStory ? (
          <Link className="focusPanel" href={`/stories/${focusStory.slug}`}>
            <div className="focusContent">
              <h2>今日焦点</h2>
              <h3
                className="focusTitle"
                lang={focusStory.translatedTitle ? undefined : "en"}
              >
                {focusTitle}
              </h3>
              <p className="focusSummary">{focusSummary}</p>
              {focusStory.hasAnalysis ? (
                <dl className="focusNotes">
                  <div>
                    <dt>发生了什么</dt>
                    <dd>{focusStory.factualSummary}</dd>
                  </div>
                  {focusStory.whyItMatters ? (
                    <div>
                      <dt>为什么值得看</dt>
                      <dd>{focusStory.whyItMatters}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
            <div className="focusScore">
              <span>相关度</span>
              <strong>
                {Math.round(
                  (focusStory.overallScore ?? focusStory.relevanceScore ?? 0) *
                    100,
                )}
              </strong>
              <small>
                类别：
                {focusStory.contentType
                  ? contentTypeLabels[focusStory.contentType]
                  : "情报"}
              </small>
              <small>来源：{focusStory.sourceName ?? "未知信源"}</small>
              <span className="focusLinkHint">
                阅读 Story <ArrowRight aria-hidden="true" size={15} />
              </span>
            </div>
          </Link>
        ) : (
          <div className="focusPanel focusPanelEmpty">
            <div className="focusContent">
              <h2>今日焦点</h2>
              <p className="focusEmptyTitle">等待第一条可验证的 Story</p>
              <p className="focusSummary">{focusSummary}</p>
            </div>
          </div>
        )}
      </section>

      <div className="contentShell homeFeedShell">
        <section className="feedColumn" aria-labelledby="feed-title">
          <div className="feedToolbar">
            <nav className="filterNav" aria-label="内容筛选">
              {filters.map((filter) => {
                const active =
                  filter.value === activeType || (!filter.value && !activeType);
                return (
                  <Link
                    key={filter.label}
                    className={active ? "active" : undefined}
                    href={filter.value ? `/?type=${filter.value}` : "/"}
                    aria-current={active ? "page" : undefined}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </nav>
            <div className="feedSort">
              <h2 id="feed-title">情报流</h2>
              <span>
                {activeType
                  ? activeType === "product"
                    ? "产品 · 按发布时间排序"
                    : `${contentTypeLabels[activeType]} · 按相关度排序`
                  : "按相关度排序"}
              </span>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="storyColumns" aria-hidden="true">
              <span>#</span>
              <span>Story</span>
              <span>
                {activeType === "product" ? "产品简介" : "为什么值得看"}
              </span>
              <span>相关度</span>
            </div>
          ) : null}

          {items.length === 0 ? (
            <EmptyFeed filtered={Boolean(activeType)} />
          ) : (
            <div className="storyList">
              {items.map((story, index) => (
                <StoryRow
                  story={story}
                  index={index}
                  key={story.id}
                  lead={index === 0}
                />
              ))}
            </div>
          )}

          {total > items.length ? (
            <div className="feedLimit">
              <ArrowDown aria-hidden="true" size={17} />
              当前展示相关度最高的 {items.length} 条，共 {total} 条
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function DatabaseSetupState() {
  return (
    <main className="setupPage">
      <div className="setupGrid">
        <div>
          <p className="setupLabel">需要完成一次本地配置</p>
          <h1>连接数据库，情报流就会出现。</h1>
          <p className="setupDescription">
            页面不会填充样例新闻。配置 PostgreSQL 后，真实的抓取、评分和 Story
            聚类结果会直接呈现在这里。
          </p>
        </div>
        <ol className="setupSteps">
          <li>
            <span>环境变量</span>
            <code>DATABASE_URL=postgresql://...</code>
          </li>
          <li>
            <span>初始化数据库</span>
            <code>pnpm db:migrate</code>
          </li>
          <li>
            <span>生成情报流</span>
            <code>pnpm ingest:due &amp;&amp; pnpm process:stories</code>
          </li>
        </ol>
      </div>
    </main>
  );
}
