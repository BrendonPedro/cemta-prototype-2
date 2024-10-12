// app/shared/components/MenuAnalyzer.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../components/AuthProvider";
import Image from "next/image";
import MenuUpload from "./MenuUpload";
import VertexAiResultsDisplay from "../../../components/vertexAiResultsDisplay";
import {
  getMenuCount,
  getVertexAiResultsByRestaurant,
} from "@/app/services/firebaseFirestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { slugify } from "@/app/utils/stringUtils";

const MAX_MENUS_PER_USER = 150;

const MenuAnalyzer = () => {
  const { firebaseToken, userId, loading } = useAuth();
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
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [existingMenuInfo, setExistingMenuInfo] = useState<any | undefined>(
    undefined
  );
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string>("");
  const [isCheckingExistingMenu, setIsCheckingExistingMenu] = useState(false);

  // Memoize handleProcessing to prevent unnecessary re-renders
  const handleProcessing = useCallback(
    async (reprocess = false) => {
      console.log("Variables before processing:", {
        firebaseToken,
        menuImageUrl,
        menuName,
        userId,
        restaurantId,
        menuId,
      });

      if (
        !firebaseToken ||
        !menuImageUrl ||
        !menuName ||
        !userId ||
        !restaurantId ||
        !menuId
      ) {
        setAlert({
          type: "destructive",
          message: "Missing required information. Please try again.",
        });
        return;
      }

      if (menuCount >= MAX_MENUS_PER_USER && !reprocess) {
        setAlert({
          type: "destructive",
          message: `You have reached the maximum limit of ${MAX_MENUS_PER_USER} menus. Please delete or update an existing menu.`,
        });
        return;
      }

      setIsProcessing(true);
      setAlert(null);
      setProcessingError(null);

      try {
        console.log("Starting Vertex AI processing...");
        const response = await fetch("/api/vertex-ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            imageUrl: menuImageUrl,
            userId,
            restaurantId,
            menuName,
            menuId,
            forceReprocess: reprocess,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error from /api/vertex-ai:", errorData);
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        console.log("Vertex AI processing result:", result);

        setLatestVertexProcessingId(menuId);
        setIsProcessed(true);
        setIsCached(result.cached);
        setIsAnalyzed(true);

        if (!result.cached) {
          setMenuCount((prevCount) => prevCount + 1);
        }

        setAlert({
          type: "default",
          message: result.cached
            ? "This menu has been retrieved from the cache."
            : "Menu processed successfully.",
          lastUpdated: new Date(result.timestamp).toLocaleString(),
        });

        // Save the results
        console.log("Saving Vertex AI results...");
        const saveResponse = await fetch("/api/saveVertexAiResults", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            menuData: result.menuData,
            menuId: result.processingId,
            restaurantId,
            menuName,
            imageUrl: menuImageUrl,
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${saveResponse.status}`
          );
        }

        console.log("Vertex AI results saved successfully");

        // **Update existingMenuInfo with the new menu's info**
        setExistingMenuInfo({
          id: menuId,
          restaurantName: menuName,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("Vertex AI processing failed", error);
        setProcessingError(
          error.message || "Failed to process the menu. Please try again."
        );
      } finally {
        setIsProcessing(false);
      }
    },

    [
      firebaseToken,
      menuImageUrl,
      menuName,
      userId,
      restaurantId,
      menuId,
      menuCount,
    ]
  );

  // Use useEffect to trigger processing only when all required variables are set
  useEffect(() => {
    if (
      firebaseToken &&
      menuImageUrl &&
      menuName &&
      userId &&
      restaurantId &&
      menuId &&
      !isProcessing &&
      !isProcessed &&
      !isCached &&
      previewUrl &&
      !isCheckingExistingMenu &&
      existingMenuInfo === null // Only process if we have checked and found no existing menu
    ) {
      handleProcessing();
    }
  }, [
    firebaseToken,
    menuImageUrl,
    menuName,
    userId,
    restaurantId,
    menuId,
    isProcessing,
    isProcessed,
    isCached,
    previewUrl,
    isCheckingExistingMenu,
    existingMenuInfo,
    handleProcessing,
  ]);

  const handleUpload = async (
    uploadedUrl: string,
    preview: string,
    fileName: string
  ) => {
    // Reset existing menu info before checking
    setExistingMenuInfo(undefined);
    setIsCheckingExistingMenu(true); // Start checking

    // Set other states
    setMenuImageUrl(uploadedUrl);
    setPreviewUrl(preview);
    setIsProcessed(false);
    setIsCached(false);
    setAlert(null);
    setIsAnalyzed(false);

    // Extract restaurant name and ID
    const restaurantName = extractRestaurantName(fileName);
    setMenuName(restaurantName);

    // Generate menuId
    const generatedMenuId = `${slugify(restaurantName)}_${slugify(fileName)}`;
    setMenuId(generatedMenuId);

    const extractedRestaurantId = extractRestaurantId(fileName);
    setRestaurantId(extractedRestaurantId || slugify(restaurantName));

    // Use local variables for immediate use
    const currentMenuName = restaurantName;
    const currentMenuId = generatedMenuId;
    const currentRestaurantId =
      extractedRestaurantId || slugify(restaurantName);

    // Check if menu already exists in the database
    if (userId) {
      try {
        console.log("Checking for existing menu with name:", currentMenuName);
        const existingResults = await getVertexAiResultsByRestaurant(
          userId,
          currentMenuName
        );
        if (existingResults) {
          setExistingMenuInfo(existingResults);
          console.log("Existing menu found:", existingResults);
          setIsCached(true);
          setAlert({
            type: "default",
            message: "Menu already exists in the database.",
            lastUpdated: new Date(existingResults.timestamp).toLocaleString(),
          });
        } else {
          setExistingMenuInfo(null);
          console.log("No existing menu found.");
          setIsCached(false);
        }
      } catch (error) {
        console.error("Error checking for existing menu:", error);
      }
    }

    setIsCheckingExistingMenu(false); // Finished checking
    console.log("Finished checking for existing menu.");
  };

  // Monitor changes to existingMenuInfo
  useEffect(() => {
    console.log("existingMenuInfo updated:", existingMenuInfo);
  }, [existingMenuInfo]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-4 text-3xl font-semibold text-teal-900">Loading...</p>
      </div>
    );
  }

  // Helper functions
  function extractRestaurantId(fileName: string): string {
    const match = fileName.match(/restaurant_(\w+)/);
    return match ? match[1] : slugify(fileName.split(".")[0]);
  }

  function extractRestaurantName(fileName: string): string {
    // Adjusted to extract the name correctly
    const nameWithoutExtension = fileName.substring(
      0,
      fileName.lastIndexOf(".")
    );
    return nameWithoutExtension || fileName;
  }

  return (
    <div className="menu-analyzer">
      <Card className="w-full mt-0">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:space-x-6">
            {/* Left Side - Menu Upload and Image Preview */}
            <div className="w-full md:w-1/2">
              <MenuUpload
                onUpload={handleUpload}
                onFileChange={(file) => {
                  const preview = URL.createObjectURL(file);
                  setPreviewUrl(preview);
                }}
              />
              {previewUrl && (
                <div className="preview-section mt-4">
                  <h2 className="text-xl font-semibold mb-2">Image Preview</h2>
                  <div className="flex justify-center items-center bg-gray-100 rounded-lg p-2">
                    <Image
                      src={previewUrl}
                      alt="Menu Preview"
                      width={400}
                      height={600}
                      style={{ objectFit: "contain" }}
                      className="max-w-full h-auto max-h-[60vh]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Instructions or Existing Menu Info */}
            <div className="w-full md:w-1/2 mt-4 md:mt-0">
              {previewUrl ? (
                <>
                  {existingMenuInfo === undefined || isCheckingExistingMenu ? (
                    // Show loader and message while checking for existing menu
                    <div className="mt-4 p-4 bg-gray-100 rounded-md">
                      <div className="flex items-center justify-center">
                        <Spinner className="mr-2 h-4 w-4 text-teal-500" />
                        <span>Checking for existing menu...</span>
                      </div>
                    </div>
                  ) : isProcessing ? (
                    // Processing Message
                    <div className="mt-4 p-4 bg-gray-100 rounded-md">
                      <div className="flex items-center justify-center">
                        <Spinner className="mr-2 h-4 w-4 text-teal-500" />
                        <span>Processing menu, please wait...</span>
                      </div>
                    </div>
                  ) : existingMenuInfo ? (
                    // Existing or Newly Processed Menu Info
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <h2 className="text-xl font-semibold mb-2">
                        {isCached
                          ? "Existing Menu Found"
                          : "Menu Processed Successfully"}
                      </h2>
                      <p>Restaurant Name: {existingMenuInfo.restaurantName}</p>
                      <p>
                        Last Updated:{" "}
                        {new Date(existingMenuInfo.timestamp).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {isCached
                          ? "Please review the existing menu before reprocessing."
                          : "Your menu has been processed successfully."}
                      </p>
                      <div className="mt-4 flex space-x-2">
                        <Link
                          href={`/menu-details/${existingMenuInfo.id}`}
                          passHref
                        >
                          <Button variant="nextButton2">Open Menu</Button>
                        </Link>
                        <Button
                          variant="cemta"
                          onClick={() => handleProcessing(true)}
                        >
                          Reprocess Menu
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // No Existing Menu Found Message
                    <div className="mt-4 p-4 bg-gray-100 rounded-md">
                      <div className="flex items-center mb-4">
                        <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
                        <p className="text-sm">
                          No existing menu found. Analysis will start
                          automatically.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="instructions">
                  <h2 className="text-xl font-semibold mb-2">Instructions</h2>
                  <p>Please select a menu image to begin analysis.</p>
                  <p>Accepted formats: JPEG, PNG, GIF.</p>
                  <p>
                    Ensure the image is clear and readable for accurate
                    analysis.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Alert Messages */}
          {alert && (
            <Alert variant={alert.type} className="mt-4">
              <AlertTitle>
                {alert.type === "default" ? "Notice" : "Error"}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          )}

          {/* Processing and Results Section */}
          {isProcessed && latestVertexProcessingId && (
            <VertexAiResultsDisplay
              userId={userId as string}
              latestProcessingId={latestVertexProcessingId}
              isCached={isCached}
              existingMenuInfo={existingMenuInfo}
              onReprocess={(id: string) => {
                setLatestVertexProcessingId(id);
                setIsProcessed(false);
                handleProcessing(true);
              }}
              processingError={processingError}
              menuName={menuName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuAnalyzer;
