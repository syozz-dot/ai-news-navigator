import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { FavoritesHeaderLink } from "./favorites-header-link";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="siteHeader">
      <div className="headerInner">
        <Link className="brand" href="/" aria-label="AI News Navigator 首页">
          <span className="brandMark" aria-hidden="true">
            N
          </span>
          <span className="brandName">AI News Navigator</span>
        </Link>
        <div className="headerActions">
          <FavoritesHeaderLink />
          <a
            className="githubLink"
            href="https://github.com/syozz-dot/ai-news-navigator"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
            <ArrowUpRight aria-hidden="true" size={15} />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
