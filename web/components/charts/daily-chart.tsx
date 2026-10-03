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
  ChartLegend,
  ChartTable,
  ChartTooltipBox,
  usePrefersReducedMotion,
} from "@/components/charts/chart-parts";
import {
  AXIS_TEXT_COLOR,
  GRID_COLOR,
  MANUAL_COLOR,
  SENSOR_COLOR,
  SURFACE_COLOR,
} from "@/lib/chart-colors";
import type { Stats } from "@/lib/stats";

const AXIS_TICK = { fill: AXIS_TEXT_COLOR, fontSize: 12 };
const SERIES = [
  { key: "sensor", name: "警報器", color: SENSOR_COLOR },
  { key: "manual", name: "手で追加", color: MANUAL_COLOR },
] as const;

// 日ごとの回数(警報器 / 手で追加の積み上げ棒)
export function DailyChart({ stats }: { stats: Stats }) {
  const animate = !usePrefersReducedMotion();

  return (
    <figure className="space-y-4">
      <figcaption className="text-base font-semibold text-gray-900">
        日ごとの回数
      </figcaption>
      {stats.total === 0 ? (
        <ChartEmpty>この期間の記録はまだありません。</ChartEmpty>
      ) : (
        <>
          <div style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.daily}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: GRID_COLOR }}
                  interval="preserveStartEnd"
                  minTickGap={16}
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
                      Stats["daily"][number] | undefined;
                    if (!active || !point) return null;
                    return (
                      <ChartTooltipBox
                        title={`${point.label}  計${point.total}回`}
                        rows={SERIES.map((s) => ({
                          name: s.name,
                          value: `${point[s.key]}回`,
                          color: s.color,
                        }))}
                      />
                    );
                  }}
                />
                {SERIES.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    stackId="total"
                    fill={s.color}
                    // 積み上げの区切りは背景色の 2px のすき間で表す
                    stroke={SURFACE_COLOR}
                    strokeWidth={2}
                    maxBarSize={28}
                    radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                    isAnimationActive={animate}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={SERIES.map((s) => ({
              name: s.name,
              color: s.color,
              value: `${s.key === "sensor" ? stats.sensorCount : stats.manualCount}回`,
            }))}
          />
          <ChartTable
            caption="日ごとの回数"
            columns={["日付", "警報器", "手で追加", "合計"]}
            rows={[...stats.daily].reverse().map((point) => ({
              key: point.key,
              cells: [point.label, point.sensor, point.manual, point.total],
            }))}
          />
        </>
      )}
    </figure>
  );
}
