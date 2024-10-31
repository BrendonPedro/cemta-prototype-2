// lib/database-builder/components/PlacesMonitor.tsx

import React from "react";
import { Client } from "@googlemaps/google-maps-services-js";
import {
  usePlacesFetcher,
  fetchPlacesWithLimit,
  resetProgress,
} from "../services/places";
import { generateGridPoints } from "../grid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Place } from "../types";

interface PlacesMonitorProps {
  onBatchComplete?: (results: Place[]) => void;
  townLocation?: { lat: number; lng: number };
}

export function PlacesMonitor({
  onBatchComplete,
  townLocation,
}: PlacesMonitorProps) {
  const progress = usePlacesFetcher();
  const [settings, setSettings] = React.useState({
    maxGoogleCalls: 20,
    maxYelpCalls: 50,
    batchSize: 5,
  });
  const [controller, setController] = React.useState<AbortController | null>(
    null
  );

  const handleProcessBatch = React.useCallback(async () => {
    if (!townLocation) return;

    const newController = new AbortController();
    setController(newController);

    try {
      const client = new Client({});
      const gridPoints = generateGridPoints(townLocation, 1);

      const results = await fetchPlacesWithLimit(
        client,
        gridPoints,
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        {
          ...settings,
          signal: newController.signal,
        }
      );

      if (onBatchComplete) {
        onBatchComplete(results);
      }
    } catch (error) {
      console.error("Error processing batch:", error);
    }
  }, [settings, townLocation, onBatchComplete]);

  const handlePause = React.useCallback(() => {
    controller?.abort();
    setController(null);
  }, [controller]);

  const handleReset = React.useCallback(() => {
    handlePause();
    resetProgress();
  }, [handlePause]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Places API Monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Max API Calls</label>
              <input
                type="number"
                value={settings.maxGoogleCalls}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxGoogleCalls: parseInt(e.target.value),
                  }))
                }
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min={1}
                max={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Batch Size</label>
              <input
                type="number"
                value={settings.batchSize}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    batchSize: parseInt(e.target.value),
                  }))
                }
                className="w-full mt-1 px-3 py-2 border rounded-md"
                min={1}
                max={20}
              />
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span>API Calls</span>
                <span>
                  {progress.googleCallsMade} / {settings.maxGoogleCalls}
                </span>
              </div>
              <Progress
                value={
                  (progress.googleCallsMade / settings.maxGoogleCalls) * 100
                }
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div>
                Status: <span className="font-medium">{progress.status}</span>
              </div>
              <div>Restaurants Found: {progress.totalFound}</div>
              {progress.currentLocation && (
                <div className="text-sm text-gray-600">
                  Processing: {progress.currentLocation.lat.toFixed(4)},
                  {progress.currentLocation.lng.toFixed(4)}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-x-4">
              {progress.status === "running" ? (
                <Button onClick={handlePause} variant="cemta">
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={handleProcessBatch}
                  disabled={!townLocation || progress.status === "error"}
                >
                  {progress.status === "idle" ? "Start" : "Resume"}
                </Button>
              )}
              <Button onClick={handleReset} variant="cemta">
                Reset
              </Button>
            </div>
          </div>

          {/* Errors */}
          {progress.error && (
            <Alert variant="destructive">
              <AlertDescription>{progress.error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
