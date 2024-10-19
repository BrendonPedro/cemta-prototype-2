// app/shared/components/MenuUpload.tsx

"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "../../../components/AuthProvider";
import { useDropzone, Accept } from "react-dropzone";

interface MenuUploadProps {
  onUpload: (uploadedUrl: string, previewUrl: string, fileName: string) => void;
  onFileChange: (file: File) => void;
}

const MenuUpload: React.FC<MenuUploadProps> = ({ onUpload, onFileChange }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { firebaseToken } = useAuth();

  const handleFileSelection = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      const preview = URL.createObjectURL(selectedFile);
      setPreviewUrl(preview);
      onFileChange(selectedFile);

      if (!firebaseToken) return;
      setLoading(true);

      try {
        console.log("Checking image cache...");
        const checkResponse = await fetch("/api/check-image-cache", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({ fileName: selectedFile.name }),
        });

        if (!checkResponse.ok) {
          throw new Error(`HTTP error! status: ${checkResponse.status}`);
        }

        const checkResult = await checkResponse.json();
        console.log("Check image cache result:", checkResult);

        if (checkResult.exists) {
          // Use the cached URL
          onUpload(checkResult.url, preview, selectedFile.name);
        } else {
          // Upload the file if it doesn't exist in cache
          console.log("Uploading to GCS...");
          const formData = new FormData();
          formData.append("file", selectedFile);

          const uploadResponse = await fetch("/api/upload-to-gcs", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firebaseToken}`,
            },
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error(`HTTP error! status: ${uploadResponse.status}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log("Upload result:", uploadResult);

          onUpload(uploadResult.url, preview, selectedFile.name);
        }
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        setLoading(false);
      }
    },
    [onFileChange, firebaseToken, onUpload]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        handleFileSelection(acceptedFiles[0]);
      }
    },
    [handleFileSelection],
  );

  const acceptedFileTypes: Accept = {
    "image/*": [".jpeg", ".jpg", ".png", ".gif"],
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-customTeal hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the menu image here ...</p>
        ) : (
          <p>Drag & drop a menu image here, or click to select a file</p>
        )}
      </div>

      {loading && (
        <div className="mt-4 p-4 bg-blue-100 text-blue-700 rounded-md">
          Uploading and processing image, please wait...
        </div>
      )}
    </div>
  );
};

export default MenuUpload;
