import { Newspaper } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export function EmptyFeed({ filtered }: { filtered: boolean }) {
  return (
    <section className="emptyState">
      <Newspaper aria-hidden="true" size={32} weight="light" />
      <h2>{filtered ? "该分类还没有 Story" : "情报流正在等待第一批内容"}</h2>
      <p>
        {filtered
          ? "当前筛选没有达到展示阈值的内容；全部情报仍然保留。"
          : "先运行 ingest:due 获取内容，再运行 process:stories 完成评分与聚类。"}
      </p>
      {filtered ? (
        <Link className="emptyStateAction" href="/">
          返回全部情报
        </Link>
      ) : null}
    </section>
  );
}
