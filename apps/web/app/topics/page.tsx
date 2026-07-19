import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CURATED_TOPICS } from "@ai-news-navigator/intelligence";
import type { Metadata } from "next";
import Link from "next/link";

import { getTopicIndex } from "../../lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "主题地图",
  description: "按稳定主题浏览 AI 新闻、论文、产品与模型进展。",
};

const groupCopy = {
  focus: {
    eyebrow: "PRIMARY DIRECTIONS",
    title: "重点方向",
    description: "持续影响产品判断与近期实践的六条主线。",
  },
  foundation: {
    eyebrow: "CAPABILITIES & ECOSYSTEM",
    title: "能力与生态",
    description: "理解模型能力变化、交互形态与开放生态的基础层。",
  },
} as const;

export default async function TopicsPage() {
  const topicItems = process.env.DATABASE_URL
    ? await getTopicIndex()
    : CURATED_TOPICS.map((topic) => ({
        ...topic,
        total: 0,
        recentCount: 0,
        latestStory: null,
      }));

  return (
    <main className="topicsPage">
      <header className="topicsHero">
        <div>
          <p className="topicsEyebrow">TOPIC MAP · 10 DIRECTIONS</p>
          <h1>按主题看 AI</h1>
        </div>
        <div className="topicsHeroIntro">
          <p>
            不追逐每天变化的标签。这里用十个稳定主题，把新闻、论文、产品和模型放回同一条演进脉络里。
          </p>
          <span>只用于浏览 · Story 会自动进入相关主题</span>
        </div>
      </header>

      {(["focus", "foundation"] as const).map((group) => {
        const copy = groupCopy[group];
        const items = topicItems.filter((topic) => topic.group === group);
        return (
          <section className="topicGroup" key={group} aria-labelledby={group}>
            <header className="topicGroupHeader">
              <div>
                <p>{copy.eyebrow}</p>
                <h2 id={group}>{copy.title}</h2>
              </div>
              <p>{copy.description}</p>
            </header>
            <div className="topicGrid">
              {items.map((topic) => {
                const latestTitle = topic.latestStory
                  ? (topic.latestStory.translatedTitle ??
                    topic.latestStory.title)
                  : null;
                return (
                  <Link
                    className="topicCard"
                    href={`/topics/${topic.slug}`}
                    key={topic.slug}
                  >
                    <div className="topicCardHeading">
                      <h3>{topic.name}</h3>
                      <ArrowRight aria-hidden="true" size={18} />
                    </div>
                    <p className="topicCardDescription">{topic.description}</p>
                    <dl className="topicCardCounts">
                      <div>
                        <dt>全部 Story</dt>
                        <dd>{topic.total}</dd>
                      </div>
                      <div>
                        <dt>近 7 天</dt>
                        <dd>{topic.recentCount}</dd>
                      </div>
                    </dl>
                    <div className="topicCardLatest">
                      <span>最新进展</span>
                      <strong>{latestTitle ?? "等待第一条相关 Story"}</strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
