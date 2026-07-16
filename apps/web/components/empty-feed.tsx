import { Newspaper } from "@phosphor-icons/react/dist/ssr";

export function EmptyFeed({ filtered }: { filtered: boolean }) {
  return (
    <section className="emptyState">
      <Newspaper aria-hidden="true" size={32} weight="light" />
      <h2>{filtered ? "该分类还没有 Story" : "情报流正在等待第一批内容"}</h2>
      <p>
        {filtered
          ? "切换到全部内容，或等待下一次抓取和 Story 处理。"
          : "先运行 ingest:due 获取内容，再运行 process:stories 完成评分与聚类。"}
      </p>
    </section>
  );
}
