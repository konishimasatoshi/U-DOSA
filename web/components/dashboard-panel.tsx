"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";

import { DailyChart } from "@/components/charts/daily-chart";
import { HourlyChart } from "@/components/charts/hourly-chart";
import { IntervalChart } from "@/components/charts/interval-chart";
import { ConstipationAlert } from "@/components/constipation-alert";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHours } from "@/lib/format";
import { buildStats, RANGE_OPTIONS, type RangeDays } from "@/lib/stats";
import { useEvents, useNow } from "@/lib/use-events";

// ダッシュボード。期間(1 / 7 / 30 / 90 日)を選び、サマリーとグラフを出す。
// 設定の時間(u_dosa_settings)うんちがなければ、見出しの右に便秘警報を出す。
export function DashboardPanel() {
  const { events, loading, error } = useEvents();
  const now = useNow(60_000);
  const [days, setDays] = useState<RangeDays>(7);
  const stats = useMemo(
    () => buildStats(events, days, now),
    [events, days, now],
  );

  const tiles = [
    {
      label: "うんちの回数",
      value: `${stats.total}回`,
      sub: `1日平均 ${stats.perDay.toFixed(1)}回`,
    },
    {
      label: "平均の間隔",
      value:
        stats.avgIntervalHours != null
          ? formatHours(stats.avgIntervalHours)
          : "—",
      sub:
        stats.peakHour != null
          ? `多い時間帯 ${stats.peakHour}時台`
          : "記録が増えると表示されます",
    },
    {
      label: "警報器が検知",
      value: `${stats.sensorCount}回`,
      sub: `手で追加 ${stats.manualCount}回`,
    },
    {
      label: "誤検知",
      value: `${stats.falseAlarmCount}回`,
      sub:
        stats.falseAlarmRate != null
          ? `警報のうち ${Math.round(stats.falseAlarmRate * 100)}%`
          : "警報はまだありません",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl leading-tight font-semibold text-gray-900">
            ダッシュボード
          </h1>
          {!loading && !error && (
            <ConstipationAlert events={events} now={now} />
          )}
        </div>
        <Tabs
          value={String(days)}
          onValueChange={(value) => setDays(Number(value) as RangeDays)}
        >
          <TabsList aria-label="集計する期間">
            {RANGE_OPTIONS.map((option) => (
              <TabsTrigger key={option} value={String(option)}>
                {option}日
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
        >
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
          <LoaderCircle
            className="size-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          記録を読み込んでいます
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="space-y-1 rounded-2xl border border-gray-300 bg-white p-4 shadow-sm sm:p-5"
              >
                <dt className="text-sm font-semibold text-gray-700">
                  {tile.label}
                </dt>
                <dd className="text-2xl leading-snug font-bold text-gray-900 tabular-nums sm:text-3xl">
                  {tile.value}
                </dd>
                <dd className="text-xs leading-normal text-gray-600">
                  {tile.sub}
                </dd>
              </div>
            ))}
          </dl>

          {/* 1 日のときは棒が 1 本になるだけなので、日ごとのグラフは出さない */}
          {days > 1 && (
            <Card size="lg">
              <CardContent>
                <DailyChart stats={stats} />
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card size="lg" className="min-w-0">
              <CardContent>
                <HourlyChart stats={stats} />
              </CardContent>
            </Card>
            <Card size="lg" className="min-w-0">
              <CardContent>
                <IntervalChart stats={stats} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
