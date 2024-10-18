// /dashboards/page.tsx

"use client";

import React from "react";
import DashboardsRouter from "@/components/DashboardsRouter";

export default function DashboardsPage() {
  return (
    <div className="min-h-screen bg-transparent">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboards</h1>
        <DashboardsRouter />
      </main>
    </div>
  );
}
