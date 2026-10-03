import type { Metadata } from "next";

import { DashboardPanel } from "@/components/dashboard-panel";

export const metadata: Metadata = { title: "ダッシュボード" };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <DashboardPanel />
    </main>
  );
}
