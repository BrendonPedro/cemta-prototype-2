"use client";

import React, { useState, useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import Image from "next/image";
import MenuUpload from "./MenuUpload";
import ProcessingButtons from "../../../components/ProcessingButtons";
import VertexAiResultsDisplay from "../../../components/vertexAiResultsDisplay";
import { useAuth } from "../../../components/AuthProvider";
import {
  checkExistingMenus,
  getMenuCount,
  saveVertexAiResults,
  listenToLatestProcessingId,
  getVertexAiResultsByRestaurant,
} from "@/app/services/firebaseFirestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/config/firebaseConfig";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import HistoricalSearches from "@/components/HistoricalSearches";

const MAX_MENUS_PER_USER = 150;

interface VertexAiResultsDisplayProps {
  userId: string;
  latestProcessingId: string | null;
  isCached: boolean;
  onReprocess: (id: string) => void;
}

const MenuAnalyzer = () => {
  const { userId } = useClerkAuth();
  const { firebaseToken, userRole } = useAuth();
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [latestVertexProcessingId, setLatestVertexProcessingId] = useState<
    string | null
  >(null);
  const [menuName, setMenuName] = useState("");
  const [alert, setAlert] = useState<{
    type: "default" | "destructive";
    message: string;
    lastUpdated?: string;
  } | null>(null);
  const [menuCount, setMenuCount] = useState(0);
  const [isCached, setIsCached] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [cachedResults, setCachedResults] = useState<any | null>(null);

  useEffect(() => {
    if (userId) {
      getMenuCount(userId).then(setMenuCount);
      const unsubscribe = listenToLatestProcessingId(userId, (latestId) => {
        setLatestVertexProcessingId(latestId);
      });
      return () => unsubscribe();
    }
  }, [userId, setLatestVertexProcessingId]);

  const handleUpload = async (
    uploadedUrl: string,
    preview: string,
    fileName: string
  ) => {
    setMenuImageUrl(uploadedUrl);
    setPreviewUrl(preview);
    setLatestVertexProcessingId(null);
    setIsProcessed(false);
    setIsCached(false);

    const generatedName = `${
      fileName.split(".")[0]
    }_${new Date().toISOString()}`;
    setMenuName(generatedName);

    // Check for cached results
    if (userId) {
      const extractedName = extractRestaurantName(fileName);
      const existingResults = await getVertexAiResultsByRestaurant(
        userId,
        extractedName
      );
      if (existingResults) {
        setCachedResults(existingResults);
        setIsCached(true);
        setAlert({
          type: "default",
          message: "Cached results found for this restaurant.",
          lastUpdated: new Date(existingResults.timestamp).toLocaleString(),
        });
      } else {
        setCachedResults(null);
        setIsCached(false);
        setAlert(null);
      }
    }
  };

  const handleFileChange = () => {
    setIsProcessed(false);
    setIsCached(false);
    setCachedResults(null);
    setAlert(null);
  };

  const handleProcessing = async (forceReprocess: boolean = false) => {
    if (!firebaseToken || !menuImageUrl || !menuName || !userId) return;
    if (menuCount >= MAX_MENUS_PER_USER && !forceReprocess) {
      setAlert({
        type: "destructive",
        message: `You have reached the maximum limit of ${MAX_MENUS_PER_USER} menus. Please delete or update an existing menu.`,
      });
      return;
    }

    setIsProcessing(true);
    setAlert(null);

    try {
      const response = await fetch("/api/vertex-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          imageUrl: menuImageUrl,
          userId,
          menuName,
          forceReprocess,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process with Vertex AI");
      }

      const result = await response.json();
      console.log("Vertex AI processing result:", result);

          console.log("Latest processing ID:", result.processingId);
          console.log("Is cached:", result.cached);
          console.log("API call count:", result.apiCallCount);

      // Optimistic update
      setLatestVertexProcessingId(result.processingId);
      setIsProcessed(true);
      setIsCached(result.cached);

      // Extract restaurantName safely
      const restaurantName = result.menuData?.restaurant_info?.name?.original;

      // Update Firestore (this can happen in the background)
      await saveVertexAiResults(
        userId,
        result.menuData,
        menuName,
        restaurantName
      );

      if (!result.cached) {
        setMenuCount((prevCount) => prevCount + 1);
      }

      if (result.cached) {
        setAlert({
          type: "default",
          message: "This menu has been retrieved from the cache.",
          lastUpdated: new Date(result.timestamp).toLocaleString(),
        });
      }
    } catch (error: any) {
      console.error("Vertex AI processing failed", error);
      setAlert({
        type: "destructive",
        message: `Failed to process the menu. ${
          error.message || "Please try again."
        } (${error.name}: ${error.stack})`, // Add more error details
      });
    } finally {
      setIsProcessing(false);
      setReprocessing(false);
    }
  };

  const handleReprocess = (id: string) => {
    setReprocessing(true);
    setMenuName(id);
    handleProcessing(true);
  };

 return (
   <div className="grid md:grid-cols-2 gap-8">
     <Card>
       <CardContent className="p-6">
         <h2 className="text-2xl font-semibold mb-4">Upload Menu</h2>
         <MenuUpload onUpload={handleUpload} onFileChange={handleFileChange} />
         {menuImageUrl && !cachedResults && (
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <span className="inline-flex items-center mt-4 w-full">
                   <ProcessingButtons
                     onProcess={() => handleProcessing(false)}
                     isProcessing={isProcessing}
                     isDisabled={isProcessed}
                     isCached={isCached}
                     isUploaded={!!menuImageUrl}
                   />
                   {isProcessed && (
                     <Info className="ml-2 h-4 w-4 text-blue-500" />
                   )}
                 </span>
               </TooltipTrigger>
               <TooltipContent>
                 {isProcessed
                   ? "Menu has been processed. Upload a new image to process again."
                   : "Analyze the uploaded menu image"}
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
         )}
       </CardContent>
     </Card>
     <Card>
       <CardContent className="p-6">
         <h2 className="text-2xl font-semibold mb-4">Menu Preview</h2>
         {!previewUrl ? (
           <div className="flex justify-center items-center h-64 bg-muted rounded-lg">
             <p className="text-muted-foreground">
               Upload a menu to preview and process
             </p>
           </div>
         ) : (
           <div>
             <Image
               src={previewUrl}
               alt="Uploaded Menu"
               width={500}
               height={500}
               layout="responsive"
               objectFit="contain"
             />
           </div>
         )}
       </CardContent>
     </Card>
     {alert && (
       <div className="md:col-span-2">
         <Alert variant={alert.type}>
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>
             {alert.type === "destructive" ? "Error" : "Notice"}
           </AlertTitle>
           <AlertDescription>
             {alert.message}
             {alert.lastUpdated && <> Last updated: {alert.lastUpdated}</>}
           </AlertDescription>
           {isCached && (
             <Button
               variant="cemta"
               size="sm"
               className="mt-2"
               onClick={() => handleProcessing(true)}
             >
               <RefreshCw className="mr-2 h-4 w-4" />
               Reprocess (Premium)
             </Button>
           )}
         </Alert>
       </div>
     )}
     <div className="md:col-span-2">
       {isProcessing ? (
         <div className="flex justify-center items-center">
           <Spinner className="h-8 w-8 text-primary mr-2" />
           <span>Processing menu, please wait...</span>
         </div>
       ) : (latestVertexProcessingId || cachedResults) ? (
         <VertexAiResultsDisplay
           userId={userId as string}
           latestProcessingId={latestVertexProcessingId || cachedResults?.processingId}
           isCached={isCached}
           onReprocess={handleReprocess}
         />
       ) : null}
     </div>
   </div>
 );
};

// Helper function to extract restaurant name from filename
function extractRestaurantName(fileName: string): string {
  // Implement your logic to extract restaurant name from the filename
  // For example, you could remove file extension and use the remaining string
  return fileName.split(".")[0];
}

export default MenuAnalyzer;
