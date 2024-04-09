// The top of your MenuUpload component file
"use client";

import React, { useState } from "react";

const MenuUpload = () => {
  const [file, setFile] = useState(null); // Adjusted for simplicity; add your file type back if needed
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    // Convert file to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result
        .replace("data:", "")
        .replace(/^.+,/, "");

      // Send the base64 encoded file and filename to your new server endpoint
      try {
        const response = await fetch("/api/processMenu", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: base64String,
            fileName: file.name,
          }),
        });

        if (response.ok) {
          // Handle success
          console.log("Upload and processing successful");
        } else {
          // Handle failure
          console.error("Upload or processing failed");
        }
      } catch (error) {
        console.error("Error uploading the file:", error);
      }
    };
    reader.onerror = (error) => console.log("Error: ", error);

    setLoading(false);
    setFile(null); // Reset file input
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <input type="file" onChange={handleFileChange} className="mb-4" />
      <button
        onClick={handleUpload}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
      >
        {loading ? "Processing..." : "Upload Menu"}
      </button>
    </div>
  );
};

export default MenuUpload;