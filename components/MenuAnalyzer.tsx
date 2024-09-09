"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import MenuUpload from "./MenuUpload";
import ProcessingButtons from "./ProcessingButtons";
import DocumentAiResultsDisplay from "./DocumentAiResultsDisplay";
import VertexAiResultsDisplay from "./vertexAiResultsDisplay";
import { AuthProvider, useAuth } from "./AuthProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

type ProcessType = "none" | "documentAI" | "vertexAI";

const MenuAnalyzerContent = () => {
  const { userId } = useClerkAuth();
  const { firebaseToken } = useAuth();
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [menuName, setMenuName] = useState<string>("");
  const [processType, setProcessType] = useState<ProcessType>("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestProcessingId, setLatestProcessingId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
   const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleUpload = (uploadedUrl: string, previewUrl: string) => {
    setMenuImageUrl(uploadedUrl);
    setPreviewImageUrl(previewUrl);
    setMenuName(uploadedUrl.split("/").pop() || "Untitled Menu");
    setProcessType("none");
    setLatestProcessingId(null);
    setError(null);
  };

  const handleProcessing = async (type: "documentAI" | "vertexAI") => {
    if (!firebaseToken || !menuImageUrl || !userId || !menuName) {
      setError(
        "Missing required information. Please ensure image is uploaded and try again."
      );
      return;
    }

    setIsProcessing(true);
    setProcessType(type);
    setError(null);
    setDebugInfo(null);

    try {
      const endpoint =
        type === "documentAI" ? "/api/process-document-ai" : "/api/vertex-ai";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ imageUrl: menuImageUrl, userId, menuName }),
      });

      const result = await response.json();
      console.log(`${type} processing result:`, result);
      setDebugInfo(result);

      if (!response.ok) {
        throw new Error(result.message || `Failed to process with ${type}`);
      }

      if (type === "vertexAI") {
        if (result.menuData && Object.keys(result.menuData).length > 0) {
          setLatestProcessingId(result.processingId);
        } else {
          setError(
            result.message ||
              "No menu data found in the results. The AI might not have detected any menu items."
          );
        }
      }
    } catch (error) {
      console.error(`${type} processing failed`, error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Menu Analyzer</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <MenuUpload onUpload={handleUpload} />
          {menuImageUrl && (
            <div className="mt-4">
              <Input
                type="text"
                placeholder="Enter menu name"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="mb-2"
              />
              <ProcessingButtons
                onProcess={handleProcessing}
                isProcessing={isProcessing}
              />
            </div>
          )}
        </div>
        <div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : processType === "none" && previewImageUrl ? (
            <div>
              <h2 className="text-xl font-semibold mb-2">Uploaded Image</h2>
              <Image
                src={previewImageUrl}
                alt="Uploaded Menu"
                width={500}
                height={500}
                className="max-w-full h-auto rounded-md"
              />
            </div>
          ) : processType === "documentAI" ? (
            <DocumentAiResultsDisplay userId={userId as string} />
          ) : processType === "vertexAI" && latestProcessingId ? (
            <VertexAiResultsDisplay
              userId={userId as string}
              latestProcessingId={latestProcessingId}
            />
          ) : null}
          {debugInfo && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
          <pre className="whitespace-pre-wrap">{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
    </div>
        </div>
      </div>
  );
}; 

const MenuAnalyzer = () => (
  <AuthProvider>
    <MenuAnalyzerContent />
  </AuthProvider>
);

export default MenuAnalyzer;
