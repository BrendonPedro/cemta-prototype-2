import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/button";

interface MenuUploadProps {
  onUpload: (uploadedUrl: string, previewUrl: string) => void;
}

const MenuUpload: React.FC<MenuUploadProps> = ({ onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const { firebaseToken } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !firebaseToken) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-to-gcs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload to Google Cloud Storage");
      }

      const { url } = await response.json();
      onUpload(url, previewUrl!);
      setUploadSuccess(true);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        onChange={handleFileChange}
        accept="image/*"
        className="block w-full text-sm text-slate-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-violet-50 file:text-violet-700
          hover:file:bg-violet-100"
      />
      {previewUrl && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Image Preview</h2>
          <Image
            src={previewUrl}
            alt="Menu Preview"
            width={300}
            height={300}
            objectFit="contain"
          />
        </div>
      )}
      <Button onClick={handleUpload} disabled={!file || loading}>
        {loading ? "Uploading..." : "Upload Menu Image"}
      </Button>
      {uploadSuccess && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          Upload successful! You can now process the image.
        </div>
      )}
    </div>
  );
};

export default MenuUpload;
