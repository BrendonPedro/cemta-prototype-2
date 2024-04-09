"use client";

import React, { useState } from "react";

const TranslateButton = ({ documentId }) => {
  const [isTranslating, setIsTranslating] = useState(false);

  const handleTranslateClick = async () => {
    setIsTranslating(true);
    try {
      const response = await fetch("/api/translateMenu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Translation successful:", data);
        // Here, you might want to trigger a refresh of the menu item or a global state update
      } else {
        console.error("Translation failed:", data.error);
      }
    } catch (error) {
      console.error("Error translating:", error);
    }
    setIsTranslating(false);
  };

  return (
    <button
      onClick={handleTranslateClick}
      disabled={isTranslating}
      className={`px-4 py-2 text-white font-semibold rounded-lg ${
        isTranslating ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-700"
      }`}
    >
      {isTranslating ? "Translating..." : "Translate"}
    </button>
  );
};

export default TranslateButton;
