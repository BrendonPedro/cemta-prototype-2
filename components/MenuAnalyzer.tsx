'use client';

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import MenuUpload from "./MenuUpload";
import ProcessingButtons from "./ProcessingButtons";
import VertexAiResultsDisplay from "./vertexAiResultsDisplay";
import { AuthProvider, useAuth } from "./AuthProvider";
import {
  checkExistingMenus,
  getMenuCount,
  saveVertexAiResults,
} from "@/app/services/firebaseFirestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";

const MAX_MENUS_PER_USER = 100;

const MenuAnalyzer = () => {
  const { userId } = useClerkAuth();
  const { firebaseToken } = useAuth();
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestVertexProcessingId, setLatestVertexProcessingId] = useState<
    string | null
  >(null);
  const [menuName, setMenuName] = useState<string>("");
  const [alert, setAlert] = useState<{
    type: "default" | "destructive";
    message: string;
  } | null>(null);
  const [menuCount, setMenuCount] = useState(0);

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

  const handleProcessing = async () => {
    if (!firebaseToken || !menuImageUrl || !menuName || !userId) return;
    if (menuCount >= MAX_MENUS_PER_USER) {
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
        body: JSON.stringify({ imageUrl: menuImageUrl, userId, menuName }),
      });

      if (!response.ok) {
        throw new Error("Failed to process with Vertex AI");
      }

      const result = await response.json();
      console.log("Vertex AI processing result:", result);

      if (result.processingId) {
        setLatestVertexProcessingId(result.processingId);
        setMenuCount((prevCount) => prevCount + 1);
      } else {
        throw new Error("No processing ID returned from Vertex AI");
      }
    } catch (error) {
      console.error("Vertex AI processing failed", error);
      setAlert({
        type: "destructive",
        message: "Failed to process the menu. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AuthProvider>
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Upload Menu</h2>
            <MenuUpload onUpload={handleUpload} />
            {menuImageUrl && (
              <ProcessingButtons
                onProcess={handleProcessing}
                isProcessing={isProcessing}
              />
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
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>
        {alert && (
          <div className="md:col-span-2">
            <Alert variant={alert.type}>
              <AlertTitle>
                {alert.type === "destructive" ? "Error" : "Notice"}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          </div>
        )}
        {!isProcessing && latestVertexProcessingId && (
          <div className="md:col-span-2">
            <VertexAiResultsDisplay
              userId={userId as string}
              latestProcessingId={latestVertexProcessingId}
            />
          </div>
        )}
      </div>
    </AuthProvider>
  );
};

export default MenuAnalyzer;