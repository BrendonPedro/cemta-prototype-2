// app/(main)/dashboards/admin/database-building/page.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DatabaseBuildingMonitor from "@/lib/database-builder/components/DatabaseBuildingMonitor";
import { PlacesMonitor } from "@/lib/database-builder/components/PlacesMonitor";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Place } from "@/lib/database-builder/types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function DatabaseBuildingPage() {
  const { loading, userRole, firebaseToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("batch");
  const [error, setError] = useState<string | null>(null);

  const handlePlacesBatchComplete = async (results: Place[]) => {
    if (!firebaseToken) {
      setError("Authentication required");
      return;
    }

    try {
      const response = await fetch("/api/storage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ results }),
      });

      if (!response.ok) {
        throw new Error("Storage operation failed");
      }

      toast({
        title: "Processing Complete",
        description: `Successfully processed ${results.length} places`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error handling batch";
      setError(message);
      toast({
        title: "Processing Error",
        description: message,
        variant: "destructive",
      });
    }
  };

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
      <h1 className="text-3xl font-semibold text-gray-800">
        Database Building Control Panel
      </h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                onBatchComplete={handlePlacesBatchComplete}
                townLocation={{ lat: 24.6851, lng: 120.8307 }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
