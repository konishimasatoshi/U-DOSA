import Link from "next/link";
import { Baby } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { SiteNav } from "@/components/site-nav";

// 全ページ共通のヘッダー。左にロゴ、右にナビゲーション。
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-h-11 min-w-11 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm transition-shadow duration-200 ease-in-out group-hover:shadow-md motion-reduce:transition-none">
            <Baby className="size-5" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-tight text-gray-900">
            {APP_NAME}
          </span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
