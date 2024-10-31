// app/(main)/dashboards/admin/database-building/page.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DatabaseBuildingMonitor from "@/lib/database-builder/components/DatabaseBuildingMonitor";
import { PlacesMonitor } from "@/lib/database-builder/components/PlacesMonitor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Place } from "@/lib/database-builder/types";
import { useState } from "react";

// Remove direct Google Cloud Storage imports
export default function DatabaseBuildingPage() {
  const { loading, userRole } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("batch");

   const handlePlacesBatchComplete = async (results: Place[]) => {
     try {
       // Use the API route instead of direct storage access
       const response = await fetch("/api/storage", {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify({ results }),
       });

       if (!response.ok) {
         throw new Error("Storage operation failed");
       }

       console.log(`Processed ${results.length} places`);
     } catch (error) {
       console.error("Error handling batch:", error);
     }
   };

  if (loading || userRole !== "admin") {
    router.push("/dashboards");
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-gray-800">
        Database Building Control Panel
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Data Management Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="batch">Batch Processing</TabsTrigger>
              <TabsTrigger value="places">Places API</TabsTrigger>
            </TabsList>

            <TabsContent value="batch">
              <DatabaseBuildingMonitor />
            </TabsContent>

            <TabsContent value="places">
              <PlacesMonitor
                onBatchComplete={(results) => {
                  console.log(`Processed ${results.length} places`);
                }}
                townLocation={{ lat: 24.6851, lng: 120.8307 }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
