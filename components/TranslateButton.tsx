// TranslateButton.jsx
'use client'

import React, { useState } from "react";
import { Button } from "./ui/button"; 

const TranslateButton = ({ ocrText, setTranslation }) => {
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!ocrText) return;

    setLoading(true);
    try {
      const response = await fetch("/api/translation", {
        // Adjust this URL based on your API structure
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ocrText }),
      });
      const data = await response.json();
      if (response.ok) {
        setTranslation(data.translatedText);
      } else {
        throw new Error(data.error || "Failed to translate");
      }
    } catch (error) {
      console.error("Translation error:", error);
      alert("Error translating text: " + error.message); // or handle this error visibly in another way
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
