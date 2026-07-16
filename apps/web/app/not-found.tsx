import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="notFoundPage">
      <p>Story 不存在</p>
      <h1>这条情报可能已归档，或链接不完整。</h1>
      <Link href="/">
        <ArrowLeft size={17} />
        返回情报流
      </Link>
    </main>
  );
}
