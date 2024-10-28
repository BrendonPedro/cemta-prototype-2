// app/components/DatabaseBuildingMonitor.tsx

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildCountyDatabase,
  getLatestProcessingStatus,
  getCountyProcessingHistory,
} from "@/app/actions/database";
import type { ProcessingStatus } from "@/app/actions/database";
import type { CountyData } from "@/lib/database-builder/types";
import {
  Loader2,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  Database,
  Map,
  Settings,
} from "lucide-react";

interface Props {
  counties: CountyData[]; 
  refreshInterval?: number;
}

export default function DatabaseBuildingMonitor({
  counties,
  refreshInterval = 5000,
}: Props) {
  const [selectedCounty, setSelectedCounty] = useState<CountyData | null>(null);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("status");

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      if (!selectedCounty) return;

      try {
        const latestStatus = await getLatestProcessingStatus(
          selectedCounty.name
        );
        setStatus(latestStatus);
        setIsProcessing(latestStatus?.status === "processing");
      } catch (error) {
        console.error("Error fetching status:", error);
      }
    };

    if (isProcessing && selectedCounty) {
      fetchStatus();
      intervalId = setInterval(fetchStatus, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedCounty, refreshInterval, isProcessing]);

  const handleStartProcessing = async () => {
    if (!selectedCounty) return;

    setError(null);
    setIsProcessing(true);

    try {
      const result = await buildCountyDatabase(selectedCounty, {
        force: false,
        updateExisting: true,
      });

      if (!result.success) {
        setError(result.error || "Failed to process county");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800 animate-pulse",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Database Building Dashboard</span>
          {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <Select
            value={selectedCounty?.name}
            onValueChange={(value) => {
              const county = counties.find((c) => c.name === value);
              setSelectedCounty(county || null);
            }}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a county" />
            </SelectTrigger>
            <SelectContent>
              {counties.map((county) => (
                <SelectItem key={county.name} value={county.name}>
                  {county.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleStartProcessing}
            disabled={!selectedCounty || isProcessing}
            variant={isProcessing ? "secondary" : "default"}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Start Building
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {selectedCounty && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="status">
                <Database className="mr-2 h-4 w-4" />
                Status
              </TabsTrigger>
              <TabsTrigger value="coverage">
                <Map className="mr-2 h-4 w-4" />
                Coverage
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              {status && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Status</h3>
                      <Badge className={getStatusBadge(status.status)}>
                        {status.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium mb-1">Progress</h3>
                      <Progress value={status.progress} className="w-full" />
                    </div>
                  </div>

                  {status.stats && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Total Processed</TableCell>
                          <TableCell className="text-right">
                            {status.stats.totalProcessed}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Successful</TableCell>
                          <TableCell className="text-right">
                            {status.stats.successful}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Failed</TableCell>
                          <TableCell className="text-right">
                            {status.stats.failed}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Cached</TableCell>
                          <TableCell className="text-right">
                            {status.stats.cached}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Google API Calls</TableCell>
                          <TableCell className="text-right">
                            {status.stats.apiCalls.google}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Yelp API Calls</TableCell>
                          <TableCell className="text-right">
                            {status.stats.apiCalls.yelp}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="coverage">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Town Coverage</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Town</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Restaurants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCounty.towns.map((town) => (
                      <TableRow key={town.name}>
                        <TableCell>{town.name}</TableCell>
                        <TableCell>
                          <Badge>Pending</Badge>
                        </TableCell>
                        <TableCell className="text-right">-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Processing Settings</h3>
                {/* Add settings controls here */}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
