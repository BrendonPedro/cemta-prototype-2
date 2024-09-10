"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import MenuUpload from "./MenuUpload";
import ProcessingButtons from "./ProcessingButtons";
import DocumentAiResultsDisplay from "./DocumentAiResultsDisplay";
import VertexAiResultsDisplay from "./vertexAiResultsDisplay";
import { AuthProvider, useAuth } from "./AuthProvider";
import {
  checkExistingMenus,
  getMenuCount,
} from "@/app/services/firebaseFirestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

type ProcessType = "none" | "documentAI" | "vertexAI";

const MAX_MENUS_PER_USER = 50;

const MenuAnalyzer = () => {
  const { userId } = useClerkAuth();
  const { firebaseToken } = useAuth();
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [processType, setProcessType] = useState<ProcessType>("none");
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

  const handleUpload = async (url: string, fileName: string) => {
    setMenuImageUrl(url);
    setProcessType("none");
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

  const handleProcessing = async (type: "documentAI" | "vertexAI") => {
    if (!firebaseToken || !menuImageUrl || !menuName) return;
    if (menuCount >= MAX_MENUS_PER_USER) {
      setAlert({
        type: "destructive",
        message: `You have reached the maximum limit of ${MAX_MENUS_PER_USER} menus. Please delete or update an existing menu.`,
      });
      return;
    }

    setIsProcessing(true);
    setProcessType(type);

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

      if (!response.ok) {
        throw new Error(`Failed to process with ${type}`);
      }

      const result = await response.json();
      console.log(`${type} processing result:`, result);

      if (type === "vertexAI" && result.processingId) {
        setLatestVertexProcessingId(result.processingId);
        setMenuCount((prevCount) => prevCount + 1);
      }
    } catch (error) {
      console.error(`${type} processing failed`, error);
      setProcessType("none");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AuthProvider>
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Menu Analyzer</h1>
        {alert && (
          <Alert variant={alert.type}>
            <AlertTitle>
              {alert.type === "destructive" ? "Error" : "Notice"}
            </AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <MenuUpload onUpload={handleUpload} />
            {menuImageUrl && (
              <ProcessingButtons
                onProcess={handleProcessing}
                isProcessing={isProcessing}
              />
            )}
          </div>
          <div>
            {!menuImageUrl && (
              <div className="flex justify-center items-center h-96">
                <p className="text-gray-500">
                  Choose a menu to preview, upload it when chosen, and then
                  select a processing request.
                </p>
              </div>
            )}
            {isProcessing && (
              <div className="flex justify-center items-center h-96">
                <Spinner className="h-8 w-8 text-blue-500" />
                <span className="ml-2">Processing menu, please wait...</span>
              </div>
            )}
            {!isProcessing && processType === "none" && menuImageUrl && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Uploaded Image</h2>
                <Image
                  src={menuImageUrl}
                  alt="Uploaded Menu"
                  width={500}
                  height={500}
                  className="max-w-full h-auto rounded-md"
                />
              </div>
            )}
            {!isProcessing && processType === "documentAI" && (
              <DocumentAiResultsDisplay userId={userId as string} />
            )}
            {!isProcessing && processType === "vertexAI" && (
              <VertexAiResultsDisplay
                userId={userId as string}
                latestProcessingId={latestVertexProcessingId}
              />
            )}
          </div>
        </div>
      </div>
    </AuthProvider>
  );
};

export default MenuAnalyzer;
