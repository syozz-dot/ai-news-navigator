import { ArrowDown } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { EmptyFeed } from "../components/empty-feed";
import { SourceHealth } from "../components/source-health";
import { StoryRow } from "../components/story-row";
import { contentTypeLabels, formatCalendarDate } from "../lib/presentation";
import {
  getSourceHealth,
  getStoryFeed,
  type ContentType,
} from "../lib/queries";

export const dynamic = "force-dynamic";

const filters: Array<{ label: string; value?: ContentType }> = [
  { label: "全部" },
  { label: "新闻", value: "news" },
  { label: "论文", value: "paper" },
  { label: "产品", value: "product" },
  { label: "发布", value: "release" },
];

function parseContentType(value: string | undefined): ContentType | undefined {
  const allowed: ContentType[] = [
    "news",
    "paper",
    "product",
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
  const [{ items, total }, sourceHealth] = await Promise.all([
    getStoryFeed(activeType),
    getSourceHealth(),
  ]);
  const confirmed = items.filter(
    (story) => story.status === "confirmed",
  ).length;

  return (
    <main>
      <section className="feedIntro">
        <div className="introDate">{formatCalendarDate()}</div>
        <div className="introCopy">
          <h1>值得判断的 AI 进展</h1>
          <p>从原始资讯到可验证的 Story。先看事实，再判断影响。</p>
        </div>
        <dl className="introMetrics">
          <div>
            <dt>当前 Story</dt>
            <dd>{total}</dd>
          </div>
          <div>
            <dt>多源确认</dt>
            <dd>{confirmed}</dd>
          </div>
          <div>
            <dt>可用信源</dt>
            <dd>
              {
                sourceHealth.filter((source) => source.status === "active")
                  .length
              }
            </dd>
          </div>
        </dl>
      </section>

      <div className="contentShell">
        <section className="feedColumn" aria-labelledby="feed-title">
          <div className="feedToolbar">
            <div>
              <h2 id="feed-title">情报流</h2>
              <span>
                {activeType
                  ? contentTypeLabels[activeType]
                  : "按相关度与时间排序"}
              </span>
            </div>
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
          </div>

          {items.length === 0 ? (
            <EmptyFeed filtered={Boolean(activeType)} />
          ) : (
            <div className="storyList">
              {items.map((story, index) => (
                <StoryRow story={story} index={index} key={story.id} />
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

        <aside className="signalRail" aria-label="情报流状态">
          <SourceHealth sources={sourceHealth} />
          <section className="railSection methodSection">
            <h2>阅读边界</h2>
            <ol>
              <li>
                <strong>事实</strong>
                <span>来自原文与多个独立信源</span>
              </li>
              <li>
                <strong>信号</strong>
                <span>由可解释规则计算，不替代判断</span>
              </li>
              <li>
                <strong>分析</strong>
                <span>未生成时明确留空，不补写结论</span>
              </li>
            </ol>
          </section>
        </aside>
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
