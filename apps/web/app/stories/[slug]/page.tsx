import {
  ArrowLeft,
  ArrowUpRight,
  Circle,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  buildRuleDigest,
  buildRuleSignalNote,
  contentTypeLabels,
  formatFullDateTime,
  formatScore,
  signalLabel,
  storyStatusLabels,
} from "../../../lib/presentation";
import { getStoryDetail } from "../../../lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryDetail(slug);
  return story
    ? {
        title: story.translatedTitle ?? story.title,
        description: story.factualSummary ?? story.excerpt,
      }
    : { title: "Story 不存在" };
}

export default async function StoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ slug }, { view }] = await Promise.all([params, searchParams]);
  const story = await getStoryDetail(slug);
  if (!story) notFound();

  const productView = view === "product";
  const score = productView
    ? story.productImpactScore
    : (story.overallScore ?? story.relevanceScore);
  const scoreLabel = productView ? "产品信号" : "相关度";
  const factualSummary =
    story.analysis?.factualSummary ??
    story.factualSummary ??
    buildRuleDigest(story);
  const displayTitle = story.analysis?.translatedTitle ?? story.title;

  return (
    <main className="storyPage">
      <div className="storyDetailShell">
        <Link className="backLink" href={productView ? "/?type=product" : "/"}>
          <ArrowLeft size={17} />
          {productView ? "返回产品视角" : "返回情报流"}
        </Link>
        <header className="storyHero">
          <div className="storyHeroMeta">
            {productView ? (
              <span className="productLensTag">产品线索</span>
            ) : null}
            <span>
              {productView ? "原始类型：" : ""}
              {story.contentType
                ? contentTypeLabels[story.contentType]
                : "情报"}
            </span>
            <span>{story.sourceName ?? "未知信源"}</span>
            <span>{formatFullDateTime(story.lastPublishedAt)}</span>
          </div>
          <h1 lang={story.analysis?.translatedTitle ? undefined : "en"}>
            {displayTitle}
          </h1>
          {story.analysis?.translatedTitle ? (
            <p className="storyOriginalTitle" lang="en">
              原文：{story.title}
            </p>
          ) : (
            <p className="storyOriginalTitle">英文原文索引 · 标题保持原样</p>
          )}
          {factualSummary ? <p>{factualSummary}</p> : null}
        </header>

        <dl className="storyMetrics">
          <div>
            <dt>{scoreLabel}</dt>
            <dd>{formatScore(score)}</dd>
          </div>
          <div>
            <dt>信源</dt>
            <dd>{story.independentSourceCount}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{storyStatusLabels[story.status]}</dd>
          </div>
          <div>
            <dt>分析</dt>
            <dd>{story.analysis ? "已生成" : "未生成"}</dd>
          </div>
        </dl>

        <div className="analysisLayout">
          <article className="analysisBody">
            {productView ? (
              <section className="productLensIntro">
                <h2>产品判断</h2>
                {story.analysis?.productImpact ? (
                  <p>{story.analysis.productImpact}</p>
                ) : (
                  <MissingAnalysis label="产品影响分析" />
                )}
                {story.analysis?.productOpportunities.length ? (
                  <ul className="opportunityList">
                    {story.analysis.productOpportunities.map((opportunity) => (
                      <li key={opportunity}>{opportunity}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="ruleBasis">
                  <strong>入选依据</strong>
                  <p>{buildRuleSignalNote(story.matchedSignals)}</p>
                  <span>
                    产品信号 {formatScore(story.productImpactScore)} ·
                    仅用于筛选， 不把论文直接等同于产品机会。
                  </span>
                </div>
              </section>
            ) : null}

            <section>
              <h2>发生了什么</h2>
              {factualSummary ? (
                <p>{factualSummary}</p>
              ) : (
                <MissingAnalysis label="事实摘要" />
              )}
            </section>

            <section>
              <h2>为什么重要</h2>
              {story.analysis?.whyItMatters ? (
                <p>{story.analysis.whyItMatters}</p>
              ) : (
                <MissingAnalysis label="影响分析" />
              )}
            </section>

            {story.analysis?.underlyingLogic ? (
              <section>
                <h2>底层逻辑</h2>
                <p>{story.analysis.underlyingLogic}</p>
              </section>
            ) : null}

            {!productView ? (
              <section>
                <h2>产品与商业机会</h2>
                {story.analysis?.productImpact ? (
                  <p>{story.analysis.productImpact}</p>
                ) : null}
                {story.analysis?.productOpportunities.length ? (
                  <ul className="opportunityList">
                    {story.analysis.productOpportunities.map((opportunity) => (
                      <li key={opportunity}>{opportunity}</li>
                    ))}
                  </ul>
                ) : (
                  <MissingAnalysis label="机会分析" />
                )}
              </section>
            ) : null}

            {story.analysis?.openQuestions.length ? (
              <section>
                <h2>仍待确认</h2>
                <ul className="questionList">
                  {story.analysis.openQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <aside className="evidenceRail">
            <section>
              <div className="evidenceHeading">
                <h2>来源证据</h2>
                <span>{story.evidence.length} 条</span>
              </div>
              <div className="evidenceList">
                {story.evidence.map((item) => (
                  <a
                    href={item.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    key={item.id}
                  >
                    <div className="evidenceMeta">
                      <span>{item.sourceName}</span>
                      <span>{formatScore(item.relevanceScore)}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <div className="evidenceFooter">
                      <span>
                        {formatFullDateTime(
                          item.sourcePublishedAt ?? item.discoveredAt,
                        )}
                      </span>
                      <ArrowUpRight aria-hidden="true" size={16} />
                    </div>
                  </a>
                ))}
              </div>
            </section>

            <section className="signalSummary">
              <h2>规则信号</h2>
              <div>
                {story.matchedSignals.length ? (
                  story.matchedSignals.map((signal) => (
                    <span key={signal}>{signalLabel(signal)}</span>
                  ))
                ) : (
                  <span>暂无可展示信号</span>
                )}
              </div>
            </section>

            {story.analysis ? (
              <section className="analysisProvenance">
                <h2>分析来源</h2>
                <p>
                  {story.analysis.provider} / {story.analysis.model}
                </p>
                <p>置信度 {formatScore(story.analysis.confidence)}</p>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function MissingAnalysis({ label }: { label: string }) {
  return (
    <div className="missingAnalysis">
      <Circle aria-hidden="true" size={16} />
      <div>
        <strong>{label}尚未生成</strong>
        <span>当前仅展示原文证据与规则信号，不用规则补写影响结论。</span>
      </div>
    </div>
  );
}
