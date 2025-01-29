// app/shared/components/MenuUpload.tsx

"use client";

import React, { useState, useCallback } from "react";
import { useAuth } from "../../../components/AuthProvider";
import { useDropzone, Accept } from "react-dropzone";

interface MenuUploadProps {
  onUpload: (uploadedUrl: string, previewUrl: string, fileName: string) => void;
  onFileChange: (file: File) => void;
  restaurantId?: string;
}

const MenuUpload: React.FC<MenuUploadProps> = ({
  onUpload,
  onFileChange,
  restaurantId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { firebaseToken } = useAuth();

  const handleFileSelection = useCallback(
    async (selectedFile: File) => {
      try {
        setError(null);
        setFile(selectedFile);
        
        // Create a full URL for the preview
        const preview = URL.createObjectURL(selectedFile);
        setPreviewUrl(preview);
        onFileChange(selectedFile);

        if (!firebaseToken) {
          throw new Error("Authentication token not available");
        }

        setLoading(true);
        
        // Ensure we're using a full URL for the upload
        const formData = new FormData();
        formData.append("file", selectedFile);

        const metadata = {
          type: "menu",
          source: "user",
          filename: selectedFile.name,
          contentType: selectedFile.type,
          restaurantId: restaurantId,
          uploadTimestamp: new Date().toISOString(),
          // Add the full preview URL
          previewUrl: preview
        };

        console.log("Upload metadata:", metadata);
        formData.append("metadata", JSON.stringify(metadata));

        // Log FormData contents (for debugging)
        for (const pair of formData.entries()) {
          console.log('FormData entry:', pair[0], 
            pair[0] === 'metadata' ? JSON.parse(pair[1] as string) : pair[1]
          );
        }

        // Perform upload
        console.log("Initiating upload...");
        const uploadResponse = await fetch("/api/storage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firebaseToken}`,
          },
          body: formData,
        });

        console.log("Upload response status:", uploadResponse.status);
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            `Upload failed: ${errorData.message || uploadResponse.statusText}`
          );
        }

        const uploadResult = await uploadResponse.json();
        console.log("Upload success:", uploadResult);

        if (!uploadResult.url) {
          throw new Error("Upload response missing URL");
        }

        onUpload(uploadResult.url, preview, selectedFile.name);

      } catch (error) {
        console.error("Upload process failed:", error);
        setError(error instanceof Error ? error.message : "Upload failed");
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [onFileChange, firebaseToken, onUpload, restaurantId]
  );

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        handleFileSelection(acceptedFiles[0]);
      }
    },
    [handleFileSelection]
  );

  const acceptedFileTypes: Accept = {
    "image/*": [".jpeg", ".jpg", ".png", ".gif"],
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: 10 * 1024 * 1024, // 10MB max
    multiple: false,
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : error
            ? "border-red-500 bg-red-50"
            : "border-customTeal hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the menu image here ...</p>
        ) : (
          <div>
            <p>Drag & drop a menu image here, or click to select a file</p>
            <p className="text-sm text-gray-500 mt-1">
              (Max size: 10MB, Formats: JPEG, PNG, GIF)
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 p-4 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center space-x-2">
          <svg
            className="animate-spin h-5 w-5 text-blue-700"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Uploading and processing image, please wait...</span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {file && !loading && !error && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          File selected: {file.name}
        </div>
      )}
    </div>
  );
};

export default MenuUpload;