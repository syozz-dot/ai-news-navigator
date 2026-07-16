"use client";

import { Database, WarningCircle } from "@phosphor-icons/react";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const missingDatabase = error.message.includes("DATABASE_URL");

  return (
    <main className="errorPage">
      <div className="errorIcon">
        {missingDatabase ? <Database size={28} /> : <WarningCircle size={28} />}
      </div>
      <p className="errorKicker">情报流暂时不可用</p>
      <h1>{missingDatabase ? "还没有连接数据库" : "读取数据时发生错误"}</h1>
      <p>
        {missingDatabase
          ? "请配置 DATABASE_URL，执行数据库迁移后重新打开页面。"
          : "信源内容没有被清空。修复连接或查询问题后，可以安全重试。"}
      </p>
      <button type="button" onClick={reset}>
        重新读取
      </button>
    </main>
  );
}
