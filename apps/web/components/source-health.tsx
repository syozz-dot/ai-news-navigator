import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { formatDateTime } from "../lib/presentation";
import type { SourceHealthItem } from "../lib/queries";

export function SourceHealth({ sources }: { sources: SourceHealthItem[] }) {
  const activeCount = sources.filter(
    (source) => source.status === "active",
  ).length;
  const degradedCount = sources.filter(
    (source) => source.status === "degraded",
  ).length;

  return (
    <section className="railSection" id="source-health">
      <div className="railHeading">
        <h2>信源状态</h2>
        <span>
          {activeCount}/{sources.length} 正常
        </span>
      </div>
      {sources.length === 0 ? (
        <p className="railEmpty">还没有配置可用信源。</p>
      ) : (
        <div className="sourceList">
          {sources.map((source) => {
            const healthy = source.status === "active";
            return (
              <div
                className={healthy ? "sourceItem" : "sourceItem degraded"}
                key={source.id}
              >
                <div className="sourceIdentity">
                  {healthy ? (
                    <CheckCircle aria-hidden="true" size={16} weight="fill" />
                  ) : (
                    <WarningCircle aria-hidden="true" size={16} weight="fill" />
                  )}
                  <div>
                    <strong>{source.name}</strong>
                    <span>
                      {source.reliability === "primary"
                        ? "一手信源"
                        : "外部信源"}
                    </span>
                  </div>
                </div>
                <div className="sourceStatusMeta">
                  <span className="sourceState">
                    {healthy ? "正常" : "异常"}
                  </span>
                  <span className="sourceTime">
                    {formatDateTime(source.lastSuccessAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {degradedCount > 0 ? (
        <p className="healthNotice">
          {degradedCount} 个信源需要检查，内容不会静默消失。
        </p>
      ) : null}
    </section>
  );
}
