"use client";

import React from "react";
import MenuAnalyzer from "@/app/shared/components/MenuAnalyzer";

export default function RestaurantPartnerDashboard() {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        Restaurant Partner Dashboard
      </h1>
      <MenuAnalyzer />
    </div>
  );
}
