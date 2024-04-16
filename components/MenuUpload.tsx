"use client";

// MenuUpload.tsx
import React, { useState, useEffect } from "react";
import Image from 'next/image'
import { useAuth } from "@clerk/nextjs";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { firebaseConfig } from "@/config/Firebase/firebaseConfig";
import PerformOCRButton from "./performOCR.button";
import TranslateButton from "./TranslateButton";
import { initializeApp, getApp, getApps } from "firebase/app";
import { Button } from "./ui/button";

// Initialize Firebase app
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const MenuUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [menuImageUrl, setMenuImageUrl] = useState("");
  const { getToken } = useAuth();

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      try {
        const token = await getToken({ template: "integration_firebase" });
        const auth = getAuth();
        await signInWithCustomToken(auth, token);
        console.log("Firebase Authentication Successful");
      } catch (error) {
        console.error("Firebase Authentication Failed", error);
      }
    };

    authenticateWithFirebase();
  }, [getToken]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const storage = getStorage();
    const fileName = `original-menu/${new Date().toISOString()}_${file.name}`;
    const storageRef = ref(storage, fileName);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setMenuImageUrl(downloadURL); // Store image URL locally
      console.log(`File uploaded successfully: ${downloadURL}`);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setLoading(false);
      setFile(null); // Reset file input after upload
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <input
        type="file"
        onChange={handleFileChange}
        className="mb-4"
        disabled={loading}
      />
      <Button
        onClick={handleUpload}
        disabled={loading || !file}
        variant="primary"
      >
        {loading ? "Processing..." : "Upload Menu"}
      </Button>

      {menuImageUrl && (
        <>
          <PerformOCRButton imageUrl={menuImageUrl} disabled={!menuImageUrl} />
          
          <Image
            src={menuImageUrl}
            alt="Uploaded Menu"
            width={800}
            height={500}
            className="mt-4 max-w-xs"
          />
        </>
      )}
    </div>
  );
};

export default MenuUpload;
