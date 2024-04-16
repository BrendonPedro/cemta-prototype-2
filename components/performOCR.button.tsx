'use client'

import React, { useState } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { Button } from "./ui/button";

const PerformOCRButton = ({ imageUrl, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState("");

  const performOCR = async () => {
    if (!imageUrl) return;

    setLoading(true);
    try {
      const response = await fetch("/api/OCR", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await response.json();
      if (response.ok) {
        setOcrResult(data.ocrText); // Store OCR result in state

        // Save OCR result to Firebase Storage
        const ocrFile = new Blob([data.ocrText], { type: "text/plain" });
        const storageRef = ref(
          getStorage(),
          `ocr-reports/${new Date().toISOString()}_ocr.txt`
        );
        await uploadBytes(storageRef, ocrFile);

        console.log("OCR file saved successfully");
      } else {
        throw new Error(data.error || "OCR process failed");
      }
    } catch (error) {
      console.error("Error performing OCR:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
            <Button
        onClick={performOCR}
        disabled={disabled || loading} // Controlled by passed `disabled` prop and loading state
        variant="super"
      >
        {loading ? "Processing OCR..." : "Perform OCR"}
      </Button>
      {ocrResult && (
        <div className="mt-4 p-4 border-2 border-gray-500 rounded">
          <h3>OCR Result:</h3>
          <p>{ocrResult}</p>
        </div>
      )}
    </>
  );
};

export default PerformOCRButton;