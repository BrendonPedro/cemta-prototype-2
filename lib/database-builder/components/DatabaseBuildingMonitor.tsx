// components/DatabaseBuildingMonitor.tsx

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
import type { CountyData, ProcessingStats } from "@/lib/database-builder/types";
import {
  Loader2,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  Database,
  Map,
  Settings,
} from "lucide-react";
import { counties } from "@/lib/data/counties";
import type { EnhancedCountyData } from "@/lib/data/counties";
import { selectProcessingAreas } from "@/lib/database-builder/batch-processor";
import { useToast, toast } from "@/hooks/use-toast";
import { MultiSelect } from "@/components/ui/multi-select";
import { BatchProgress } from "@/app/actions/batch-processing";
import { useAuth } from "@/components/AuthProvider";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { clearBuilderCache } from "@/lib/database-builder/cache";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface BuildDatabaseResult {
  success: boolean;
  error?: string;
  stats?: {
    totalProcessed: number;
    successful: number;
    failed: number;
    cached: number;
    apiCalls: {
      google: number;
      yelp: number;
    };
  };
}

interface ProcessingConfig {
  maxResults: number;
  testMode: boolean;
  checkCacheOnly: boolean;
  clearExistingCache: boolean;
}

interface TownSelection {
  [countyName: string]: string[];
}
interface ProcessingOptions {
  batchSize: number;
  delayBetweenBatches: number;
}


interface ProcessingProgress {
  restaurantsProcessed: number;
  currentArea: string;
}

interface Props {
  refreshInterval?: number;
}

// Add API call stats interface
interface ApiCallStats {
  googleCalls: number;
  yelpCalls: number;
  restaurantsProcessed: number;
  cacheHits: number;
  cacheMisses: number;
}

// Define the form schema
const processingConfigSchema = z.object({
  maxResults: z.number().min(1).max(500),
  testMode: z.boolean(),
  checkCacheOnly: z.boolean(),
  clearExistingCache: z.boolean(),
});

type ProcessingConfigForm = z.infer<typeof processingConfigSchema>;

export default function DatabaseBuildingMonitor({
  refreshInterval = 5000,
}: Props): JSX.Element {
  const { firebaseToken } = useAuth();
  const { toast } = useToast();
  const [selectedCounty, setSelectedCounty] =
    useState<EnhancedCountyData | null>(null);
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("status");
  const [selectedCounties, setSelectedCounties] = useState<string[]>([]);
  const [selectedTowns, setSelectedTowns] = useState<TownSelection>({});
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null
  );
  const [processingStats, setProcessingStats] = useState({
    totalRestaurants: 0,
    processedAreas: new Set<string>(),
    failedAttempts: new Set<string>(),
  });
  const [options, setOptions] = useState<ProcessingOptions>({
    batchSize: 5,
    delayBetweenBatches: 5000,
  });
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    maxResults: 5, // Manage the output results here team
    testMode: true,
    checkCacheOnly: false,
    clearExistingCache: false,
  });

  const handleCountySelect = (countyName: string) => {
    const county = counties.find((c) => c.name === countyName);
    setSelectedCounty(county || null);
    setSelectedTowns({}); // Reset selected towns when county changes
  };

  const handleCountyChange = (countyName: string) => {
    const county = counties.find((c) => c.name === countyName);
    setSelectedCounty(county || null);
    // Reset selected towns when county changes
    setSelectedTowns({});
  };

  const handleTownSelect = (countyName: string, townNames: string[]) => {
    setSelectedTowns((prev) => ({
      ...prev,
      [countyName]: townNames,
    }));
  };

  const handleTownToggle = (townName: string, countyName: string) => {
    setSelectedTowns((prev) => {
      const currentTowns = prev[countyName] || [];
      const newTowns = currentTowns.includes(townName)
        ? currentTowns.filter((name) => name !== townName)
        : [...currentTowns, townName];

      return {
        ...prev,
        [countyName]: newTowns,
      };
    });
  };

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

  const [apiCallStats, setApiCallStats] = useState<ApiCallStats>({
    googleCalls: 0,
    yelpCalls: 0,
    restaurantsProcessed: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  // Initialize form
  const form = useForm<ProcessingConfigForm>({
    resolver: zodResolver(processingConfigSchema),
    defaultValues: {
      maxResults: 5,
      testMode: true,
      checkCacheOnly: false,
      clearExistingCache: false,
    },
  });

  // configuration section for UI
   const renderProcessingControls = (): JSX.Element => (
     <Form {...form}>
       <form className="space-y-4 mb-6">
         <h3 className="text-lg font-medium">Processing Configuration</h3>
         <div className="grid grid-cols-2 gap-4">
           <FormField
             control={form.control}
             name="maxResults"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Max Results</FormLabel>
                 <FormControl>
                   <Input
                     type="number"
                     {...field}
                     onChange={(e) => field.onChange(parseInt(e.target.value))}
                     min={1}
                     max={500}
                   />
                 </FormControl>
                 <FormDescription>
                   Limit the number of restaurants to process
                 </FormDescription>
               </FormItem>
             )}
           />

           <div className="space-y-2">
             <FormField
               control={form.control}
               name="testMode"
               render={({ field }) => (
                 <FormItem className="flex items-center space-x-2">
                   <FormControl>
                     <Checkbox
                       checked={field.value}
                       onCheckedChange={field.onChange}
                     />
                   </FormControl>
                   <FormLabel>Test Mode</FormLabel>
                   <FormDescription>
                     Enable to see detailed logs and slower processing
                   </FormDescription>
                 </FormItem>
               )}
             />
             <FormField
               name="checkCacheOnly"
               render={() => (
                 <FormItem className="flex items-center space-x-2">
                   <FormControl>
                     <Checkbox
                       checked={processingConfig.checkCacheOnly}
                       onCheckedChange={(checked) =>
                         setProcessingConfig((prev) => ({
                           ...prev,
                           checkCacheOnly: checked as boolean,
                         }))
                       }
                     />
                   </FormControl>
                   <FormLabel>Check Cache Only</FormLabel>
                   <FormDescription>
                     Only check cache hits/misses without processing
                   </FormDescription>
                 </FormItem>
               )}
             />
             <FormField
               name="clearExistingCache"
               render={() => (
                 <FormItem className="flex items-center space-x-2">
                   <FormControl>
                     <Checkbox
                       checked={processingConfig.clearExistingCache}
                       onCheckedChange={(checked) =>
                         setProcessingConfig((prev) => ({
                           ...prev,
                           clearExistingCache: checked as boolean,
                         }))
                       }
                     />
                   </FormControl>
                   <FormLabel>Clear Existing Cache</FormLabel>
                   <FormDescription>
                     Clear cached data before processing
                   </FormDescription>
                 </FormItem>
               )}
             />
           </div>
         </div>
       </form>
     </Form>
   );

  // Update handleStartProcessing to use form values
const handleStartProcessing = async () => {
  if (!selectedCounty) return;
  if (!firebaseToken) {
    toast({
      title: "Authentication Error",
      description: "No authentication token available",
      variant: "destructive",
    });
    return;
  }

  setIsProcessing(true);
  setError(null);

  try {
    const formData = form.getValues();

    const result: BuildDatabaseResult = await buildCountyDatabase(
      selectedCounty,
      {
        selectedTowns: selectedTowns[selectedCounty.name],
        batchSize: options.batchSize,
        delayBetweenBatches: options.delayBetweenBatches,
        firebaseToken,
        maxResults: formData.maxResults,
        testMode: formData.testMode,
        checkCacheOnly: formData.checkCacheOnly,
        clearCache: formData.clearExistingCache,
      }
    );

    // Update API call stats with type checking
    if (result.success && result.stats) {
      setApiCallStats((prev) => ({
        googleCalls: prev.googleCalls + (result.stats?.apiCalls.google || 0),
        yelpCalls: prev.yelpCalls + (result.stats?.apiCalls.yelp || 0),
        restaurantsProcessed:
          prev.restaurantsProcessed + (result.stats?.totalProcessed || 0),
        cacheHits: prev.cacheHits + (result.stats?.cached || 0),
        cacheMisses:
          prev.cacheMisses +
          ((result.stats?.totalProcessed || 0) - (result.stats?.cached || 0)),
      }));

      // Success toast with safe access to stats
      toast({
        title: "Processing Complete",
        description: `Processed ${result.stats.totalProcessed} locations`,
      });
    } else if (!result.success) {
      // Error handling
      setError(result.error || "Failed to process county");
      toast({
        title: "Processing Error",
        description: result.error || "An error occurred while processing",
        variant: "destructive",
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    setError(errorMessage);
    toast({
      title: "Processing Error",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};

     const StatsDisplay = () => (
       <div className="mt-4 bg-gray-50 rounded-lg p-4">
         <h4 className="text-sm font-medium mb-3">Processing Statistics</h4>
         <div className="grid grid-cols-2 gap-4">
           <div>
             <p className="text-sm text-gray-600">API Calls</p>
             <dl className="mt-2 space-y-1">
               <div className="flex justify-between">
                 <dt>Google Places:</dt>
                 <dd>{apiCallStats.googleCalls}</dd>
               </div>
               <div className="flex justify-between">
                 <dt>Yelp:</dt>
                 <dd>{apiCallStats.yelpCalls}</dd>
               </div>
             </dl>
           </div>
           <div>
             <p className="text-sm text-gray-600">Cache Performance</p>
             <dl className="mt-2 space-y-1">
               <div className="flex justify-between">
                 <dt>Cache Hits:</dt>
                 <dd>{apiCallStats.cacheHits}</dd>
               </div>
               <div className="flex justify-between">
                 <dt>Cache Misses:</dt>
                 <dd>{apiCallStats.cacheMisses}</dd>
               </div>
               <div className="flex justify-between">
                 <dt>Total Processed:</dt>
                 <dd>{apiCallStats.restaurantsProcessed}</dd>
               </div>
             </dl>
           </div>
         </div>

         {/* Add cache hit rate */}
         {apiCallStats.restaurantsProcessed > 0 && (
           <div className="mt-4">
             <p className="text-sm text-gray-600">Cache Hit Rate</p>
             <div className="mt-1">
               <div className="relative pt-1">
                 <div className="flex mb-2 items-center justify-between">
                   <div>
                     <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-teal-600 bg-teal-200">
                       {(
                         (apiCallStats.cacheHits /
                           apiCallStats.restaurantsProcessed) *
                         100
                       ).toFixed(1)}
                       %
                     </span>
                   </div>
                 </div>
                 <div className="overflow-hidden h-2 text-xs flex rounded bg-teal-200">
                   <div
                     style={{
                       width: `${
                         (apiCallStats.cacheHits /
                           apiCallStats.restaurantsProcessed) *
                         100
                       }%`,
                     }}
                     className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500"
                   ></div>
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     );


    // Add API stats display
    const renderApiStats = () => (
      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">API Usage Stats</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>Google API Calls: {apiCallStats.googleCalls}</p>
            <p>Yelp API Calls: {apiCallStats.yelpCalls}</p>
          </div>
          <div>
            <p>Restaurants Processed: {apiCallStats.restaurantsProcessed}</p>
            <p>Cache Hits: {apiCallStats.cacheHits}</p>
            <p>Cache Misses: {apiCallStats.cacheMisses}</p>
          </div>
        </div>
      </div>
    );

    // batch processing function
    const handleBatchProcessing = async () => {
      if (!firebaseToken) {
        toast({
          title: "Authentication Error",
          description: "No authentication token available",
          variant: "destructive",
        });
        return;
      }
      if (selectedCounties.length === 0) {
        toast({
          title: "No areas selected",
          description: "Please select at least one county to process",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);
      setError(null);

      try {
        const areas = selectProcessingAreas(selectedCounties, selectedTowns);

        const response = await fetch("/api/processBatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({ areas }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process batch");
        }

        const data = await response.json();

        toast({
          title: "Processing Complete",
          description: `Processed ${data.result.length} areas`,
        });
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Batch processing failed"
        );
      } finally {
        setIsProcessing(false);
        setBatchProgress(null);
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
          {renderProcessingControls()}
          <StatsDisplay />
          {/* Main County Selection */}
          <div className="flex items-center space-x-4">
            <Select
              value={selectedCounty?.name || ""}
              onValueChange={handleCountyChange}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select a county" />
              </SelectTrigger>
              <SelectContent>
                {counties.map((county) => (
                  <SelectItem key={county.name} value={county.name}>
                    {county.name} ({county.chineseName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Town Selection for the Main County */}
            {selectedCounty && (
              <MultiSelect
                options={
                  selectedCounty.towns.map((town) => ({
                    label: `${town.name} (${town.chineseName})`,
                    value: town.name,
                  })) || []
                }
                selected={selectedTowns[selectedCounty.name] || []}
                onChange={(values) =>
                  handleTownSelect(selectedCounty.name, values)
                }
                placeholder="Select towns (optional)"
                className="flex-1"
              />
            )}

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
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-3">
                        Processing History
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Restaurants:</span>
                          <span>{processingStats.totalRestaurants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Areas Processed:</span>
                          <span>{processingStats.processedAreas.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Failed Attempts:</span>
                          <span>{processingStats.failedAttempts.size}</span>
                        </div>
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
                        <TableHead>Chinese Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Population</TableHead>
                        <TableHead className="text-right">
                          Restaurants
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCounty.towns.map((town) => (
                        <TableRow key={town.name}>
                          <TableCell>{town.name}</TableCell>
                          <TableCell>{town.chineseName}</TableCell>
                          <TableCell>
                            <Badge>Pending</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {town.population || "-"}
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
                  <h3 className="text-lg font-medium">Batch Processing</h3>

                  <div className="space-y-4">
                    {/* Counties Selection */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Select Counties
                      </h4>
                      <MultiSelect
                        options={counties.map((county) => ({
                          label: `${county.name} (${county.chineseName})`,
                          value: county.name,
                        }))}
                        selected={selectedCounties}
                        onChange={setSelectedCounties}
                        placeholder="Select counties to process"
                      />
                    </div>

                    {/* Towns Selection for Selected Counties */}
                    {selectedCounties.map((countyName) => {
                      const county = counties.find(
                        (c) => c.name === countyName
                      );
                      if (!county) return null;

                      return (
                        <div key={countyName} className="mt-4">
                          <h4 className="text-sm font-medium mb-2">
                            {county.name} Towns
                          </h4>
                          <MultiSelect
                            options={county.towns.map((town) => ({
                              label: `${town.name} (${town.chineseName})`,
                              value: town.name,
                            }))}
                            selected={selectedTowns[countyName] || []}
                            onChange={(values) =>
                              handleTownSelect(countyName, values)
                            }
                            placeholder={`Select towns in ${county.name}`}
                          />
                        </div>
                      );
                    })}

                    {/* Processing Options */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Batch Size</h4>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={options.batchSize}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              batchSize: Math.max(
                                1,
                                parseInt(e.target.value) || 5
                              ),
                            }))
                          }
                          min={1}
                          max={10}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Delay Between Batches (ms)
                        </h4>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={options.delayBetweenBatches}
                          onChange={(e) =>
                            setOptions((prev) => ({
                              ...prev,
                              delayBetweenBatches: Math.max(
                                1000,
                                parseInt(e.target.value) || 5000
                              ),
                            }))
                          }
                          min={1000}
                          step={1000}
                        />
                      </div>
                    </div>

                    {/* Batch Processing Button */}
                    <Button
                      onClick={handleBatchProcessing}
                      disabled={isProcessing || selectedCounties.length === 0}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Batch...
                        </>
                      ) : (
                        "Start Batch Processing"
                      )}
                    </Button>

                    {/* Progress Display */}
                    {batchProgress && (
                      <div className="mt-4 space-y-2">
                        <Progress
                          value={
                            (batchProgress.processedTowns /
                              batchProgress.totalTowns) *
                            100
                          }
                        />
                        <div className="text-sm text-gray-600">
                          <p>
                            Processing {batchProgress.currentTown} in{" "}
                            {batchProgress.currentCounty}
                          </p>
                          <p>
                            {batchProgress.processedTowns}/
                            {batchProgress.totalTowns} towns completed
                          </p>
                          <p>
                            {batchProgress.processedRestaurants} restaurants
                            processed
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    );
  };

