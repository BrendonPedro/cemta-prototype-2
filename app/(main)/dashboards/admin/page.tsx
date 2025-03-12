// app/(main)/dashboards/admin/page.tsx

"use client";

import React from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DatabaseBuildingMonitor from "@/lib/database-builder/components/DatabaseBuildingMonitor";
import { Card } from "@/components/ui/card";
import { counties } from "@/lib/data/counties";

export default function AdminDashboard() {
  const { loading, userRole } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-customTeal"></div>
      </div>
    );
  }

  if (userRole !== "admin") {
    router.push("/dashboards");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-red-600">
          Unauthorized access. Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">
          Admin Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Database Building Section */}
        <Card className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Database Management</h2>
          <DatabaseBuildingMonitor />
        </Card>

        {/* Additional admin sections */}
        <Card className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Admin Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stats Overview */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-lg mb-2">Database Stats</h3>
              <div className="space-y-2 text-sm">
                <p>Total Counties: {counties.length}</p>
                <p>
                  Total Towns:{" "}
                  {counties.reduce(
                    (sum, county) => sum + county.towns.length,
                    0
                  )}
                </p>
                <p>
                  Coverage Areas:{" "}
                  {counties
                    .reduce(
                      (sum, county) =>
                        sum +
                        county.towns.reduce(
                          (townSum, town) =>
                            townSum +
                            Math.PI * Math.pow(town.searchRadiusKm, 2),
                          0
                        ),
                      0
                    )
                    .toFixed(2)}{" "}
                  km²
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-lg mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  className="w-full px-4 py-2 text-sm bg-customTeal text-white rounded hover:bg-teal-600"
                  onClick={() =>
                    router.push("/dashboards/admin/database-building")
                  }
                >
                  Full Database Builder
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* System Status Section */}
        <Card className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium">API Status</h3>
              <div className="mt-2 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">All Systems Operational</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium">Cache Status</h3>
              <div className="mt-2 text-sm">
                <p>Last Update: 2 hours ago</p>
                <p>Cache Size: 2.3 GB</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium">Processing Queue</h3>
              <div className="mt-2 text-sm">
                <p>Active Jobs: 0</p>
                <p>Pending Jobs: 0</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
