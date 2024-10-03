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

const MAX_MENUS_PER_USER = 150;

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
  const [menuName, setMenuName] = useState<string>("");
  const [alert, setAlert] = useState<{
    type: "default" | "destructive";
    message: string;
    lastUpdated?: string;
  } | null>(null);
  const [menuCount, setMenuCount] = useState(0);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (userId) {
      getMenuCount(userId).then(setMenuCount);
    }
  }, [userId]);

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

    if (userId) {
      const existingMenus = await checkExistingMenus(userId, fileName);
      if (existingMenus.length > 0) {
        setAlert({
          type: "default",
          message: `Similar menu(s) found: ${existingMenus.join(
            ", "
          )}. Consider updating an existing menu instead of creating a new one.`,
        });
      } else {
        setAlert(null);
      }
    }
  };

  const handleFileChange = () => {
    setIsProcessed(false);
    setIsCached(false);
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

      if (result.processingId) {
        setLatestVertexProcessingId(result.processingId);
        if (!result.cached) {
          setMenuCount((prevCount) => prevCount + 1);
        }
        setIsProcessed(true);
        setIsCached(result.cached);

        if (result.cached) {
          setAlert({
            type: "default",
            message: "This menu has been retrieved from the cache.",
            lastUpdated: new Date(result.timestamp).toLocaleString(),
          });
        }
      } else {
        throw new Error("No processing ID returned from Vertex AI");
      }
    } catch (error: any) {
      console.error("Vertex AI processing failed", error);
      setAlert({
        type: "destructive",
        message: `Failed to process the menu. ${
          error.message || "Please try again."
        }`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Upload Menu</h2>
          <MenuUpload onUpload={handleUpload} onFileChange={handleFileChange} />
          {menuImageUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center mt-4 w-full">
                    <ProcessingButtons
                      onProcess={() => handleProcessing(false)}
                      isProcessing={isProcessing}
                      isDisabled={isProcessed}
                    />
                    {isProcessed && (
                      <Info className="ml-2 h-4 w-4 text-blue-500" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {isProcessed
                    ? "Menu has been processed. Upload a new image to process again."
                    : "Process the uploaded menu image"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Menu Preview</h2>
          {!previewUrl && (
            <div className="flex justify-center items-center h-64 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Upload a menu to preview and process
              </p>
            </div>
          )}
          {isProcessing && (
            <div className="flex justify-center items-center h-64">
              <Spinner className="h-8 w-8 text-primary" />
              <span className="ml-2">Processing menu, please wait...</span>
            </div>
          )}
          {!isProcessing && previewUrl && (
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
      {!isProcessing && latestVertexProcessingId && (
        <div className="md:col-span-2">
          <VertexAiResultsDisplay
            userId={userId as string}
            latestProcessingId={latestVertexProcessingId}
            isCached={isCached}
          />
        </div>
      )}
    </div>
  );
};

export default MenuAnalyzer;
