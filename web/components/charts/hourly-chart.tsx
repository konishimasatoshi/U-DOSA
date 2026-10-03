"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  CHART_HEIGHT,
  ChartEmpty,
  ChartTable,
  ChartTooltipBox,
  usePrefersReducedMotion,
} from "@/components/charts/chart-parts";
import {
  AXIS_TEXT_COLOR,
  GRID_COLOR,
  PRIMARY_SERIES_COLOR,
} from "@/lib/chart-colors";
import type { Stats } from "@/lib/stats";

const AXIS_TICK = { fill: AXIS_TEXT_COLOR, fontSize: 12 };

// 時間帯ごとの回数(0〜23 時)。何時ごろに出やすいかを見る。
export function HourlyChart({ stats }: { stats: Stats }) {
  const animate = !usePrefersReducedMotion();

  return (
    <figure className="space-y-4">
      <figcaption className="text-base font-semibold text-gray-900">
        時間帯ごとの回数
      </figcaption>
      {stats.total === 0 ? (
        <ChartEmpty>この期間の記録はまだありません。</ChartEmpty>
      ) : (
        <>
          <div style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.hourly}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis
                  dataKey="hour"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: GRID_COLOR }}
                  ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
                  tickFormatter={(hour: number) => `${hour}時`}
                />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: GRID_COLOR, fillOpacity: 0.5 }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as
                      Stats["hourly"][number] | undefined;
                    if (!active || !point) return null;
                    return (
                      <ChartTooltipBox
                        title={`${point.hour}時台`}
                        rows={[{ name: "回数", value: `${point.count}回` }]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="count"
                  name="回数"
                  fill={PRIMARY_SERIES_COLOR}
                  maxBarSize={20}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={animate}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartTable
            caption="時間帯ごとの回数"
            columns={["時間帯", "回数"]}
            rows={stats.hourly
              .filter((point) => point.count > 0)
              .map((point) => ({
                key: String(point.hour),
                cells: [`${point.hour}時台`, `${point.count}回`],
              }))}
          />
        </>
      )}
    </figure>
  );
}
