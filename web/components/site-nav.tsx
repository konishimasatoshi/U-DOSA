"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const NAV_ITEMS = [
  { href: "/", label: "記録" },
  { href: "/dashboard", label: "ダッシュボード" },
] as const;

// ヘッダーのナビゲーション。現在のページをアクティブ表示する(design_system.md の「ナビゲーション」)。
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="メインナビゲーション">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-all duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset motion-reduce:transition-none sm:px-4",
                  isActive
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
