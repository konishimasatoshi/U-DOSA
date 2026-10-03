"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// prefers-reduced-motion が有効ならグラフのアニメーションを止める
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(REDUCED_MOTION_QUERY);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true,
  );
}

export const CHART_HEIGHT = 260;

export type TooltipRow = { name: string; value: string; color?: string };

// ツールチップの中身。値を強調し、系列名は控えめに。系列の色は短い線で示す。
export function ChartTooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: TooltipRow[];
}) {
  return (
    <div className="min-w-36 space-y-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-gray-900">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2">
            {row.color && (
              <span
                className="h-0.5 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
                aria-hidden="true"
              />
            )}
            <span className="font-semibold text-gray-900 tabular-nums">
              {row.value}
            </span>
            <span className="text-gray-600">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 凡例。色の印 + 名前 + 値。文字は系列の色にしない。
export function ChartLegend({
  items,
  shape = "square",
}: {
  items: { name: string; color: string; value?: string }[];
  shape?: "square" | "line";
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <li
          key={item.name}
          className="flex items-center gap-2 text-sm text-gray-700"
        >
          <span
            className={
              shape === "line"
                ? "h-0.5 w-4 shrink-0 rounded-full"
                : "size-3 shrink-0 rounded-sm"
            }
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.name}
          {item.value && (
            <span className="font-semibold text-gray-900 tabular-nums">
              {item.value}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

// グラフの値を表でも読めるようにする(ツールチップだけに頼らない)
export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <details className="group rounded-lg border border-gray-300 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-sm font-semibold text-blue-700 outline-none hover:text-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden">
        表で見る
        <ChevronDown
          className="size-4 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="max-h-80 overflow-auto px-3 pb-3">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              {columns.map((column, i) => (
                <th
                  key={column}
                  scope="col"
                  className={`py-2 font-semibold ${i > 0 ? "text-right" : ""}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-gray-100">
                {row.cells.map((cell, i) =>
                  i === 0 ? (
                    <th
                      key={i}
                      scope="row"
                      className="py-2 text-left font-normal text-gray-700"
                    >
                      {cell}
                    </th>
                  ) : (
                    <td
                      key={i}
                      className="py-2 text-right text-gray-900 tabular-nums"
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// データがないときの表示
export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-gray-200 py-10 text-center text-sm leading-relaxed text-gray-600">
      {children}
    </p>
  );
}
