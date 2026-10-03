"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
  PRIMARY_SERIES_COLOR,
  SURFACE_COLOR,
} from "@/lib/chart-colors";
import { formatHours } from "@/lib/format";
import type { Stats } from "@/lib/stats";

const AXIS_TICK = { fill: AXIS_TEXT_COLOR, fontSize: 12 };

// うんちの間隔(前回からの時間)の推移。点線は期間の平均。
export function IntervalChart({ stats }: { stats: Stats }) {
  const animate = !usePrefersReducedMotion();
  const { intervals, avgIntervalHours } = stats;

  return (
    <figure className="space-y-4">
      <figcaption className="text-base font-semibold text-gray-900">
        うんちの間隔
      </figcaption>
      {intervals.length === 0 ? (
        <ChartEmpty>
          間隔を出すには、この期間に 2 回以上の記録が必要です。
        </ChartEmpty>
      ) : (
        <>
          <div style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={intervals}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis dataKey="key" hide />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(hours: number) => `${hours}h`}
                />
                {avgIntervalHours != null && (
                  <ReferenceLine
                    y={avgIntervalHours}
                    stroke={AXIS_TEXT_COLOR}
                    strokeDasharray="4 4"
                  />
                )}
                <Tooltip
                  cursor={{ stroke: AXIS_TEXT_COLOR, strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as
                      Stats["intervals"][number] | undefined;
                    if (!active || !point) return null;
                    return (
                      <ChartTooltipBox
                        title={point.label}
                        rows={[
                          {
                            name: "前回から",
                            value: formatHours(point.hours),
                            color: PRIMARY_SERIES_COLOR,
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Line
                  type="linear"
                  dataKey="hours"
                  name="前回から"
                  stroke={PRIMARY_SERIES_COLOR}
                  strokeWidth={2}
                  dot={
                    intervals.length <= 40
                      ? {
                          r: 3,
                          fill: PRIMARY_SERIES_COLOR,
                          stroke: SURFACE_COLOR,
                          strokeWidth: 2,
                        }
                      : false
                  }
                  activeDot={{
                    r: 5,
                    fill: PRIMARY_SERIES_COLOR,
                    stroke: SURFACE_COLOR,
                    strokeWidth: 2,
                  }}
                  isAnimationActive={animate}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            shape="line"
            items={[
              { name: "前回からの時間", color: PRIMARY_SERIES_COLOR },
              ...(avgIntervalHours != null
                ? [
                    {
                      name: "平均(点線)",
                      color: AXIS_TEXT_COLOR,
                      value: formatHours(avgIntervalHours),
                    },
                  ]
                : []),
            ]}
          />
          <ChartTable
            caption="うんちの間隔"
            columns={["日時", "前回から"]}
            rows={[...intervals].reverse().map((point) => ({
              key: point.key,
              cells: [point.label, formatHours(point.hours)],
            }))}
          />
        </>
      )}
    </figure>
  );
}
