// TranslateButton.jsx
"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";

const TranslateButton = ({ ocrText, setTranslation, disabled }) => {
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!ocrText) {
      console.log("No OCR text provided for translation.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/translation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText }),
      });

      const data = await response.json();
      if (response.ok) {
        setTranslation(data.translatedText);
        console.log("Translation successful:", data.translatedText);
      } else {
        throw new Error(data.error || "Failed to translate");
      }
    } catch (error) {
      console.error("Translation error:", error);
      alert("Error translating text: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTranslate}
      disabled={loading || !ocrText}
      variant="secondary"
    >
      {loading ? "Translating..." : "Translate"}
    </Button>
  );
};

export default TranslateButton;