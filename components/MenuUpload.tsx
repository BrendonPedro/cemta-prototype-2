"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { firebaseConfig } from "@/config/firebaseConfig";
import { initializeApp, getApp, getApps } from "firebase/app";
import { Button } from "@/components/ui/button";

// Initialize Firebase app
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const MenuUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const [documentAiResults, setDocumentAiResults] = useState<any>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      try {
        const customToken = await getToken({
          template: "integration_firebase",
        });
        console.log("Retrieved custom token from Clerk:", customToken); // Log the token

        if (!customToken) {
          throw new Error("Authentication failed. Could not get custom token");
        }

        const auth = getAuth();
        const userCredential = await signInWithCustomToken(auth, customToken);
        console.log("Firebase Authentication Successful");

        const idToken = await userCredential.user.getIdToken();
        console.log("ID Token obtained:", idToken);
      } catch (error) {
        console.error("Firebase Authentication Failed", error);
      }
    };

    authenticateWithFirebase();
  }, [getToken]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const customToken = await getToken({ template: "integration_firebase" });
      console.log("Token for upload:", customToken); // Log the token for upload
      if (!customToken) {
        throw new Error("Authentication failed. Could not get custom token");
      }

      const auth = getAuth();
      const userCredential = await signInWithCustomToken(auth, customToken);
      const idToken = await userCredential.user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload-to-gcs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to Google Cloud Storage");
      }

      const { url } = await uploadResponse.json();
      setMenuImageUrl(url);

      const processResponse = await fetch("/api/process-document-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to process with Document AI");
      }

      const result = await processResponse.json();
      setDocumentAiResults(result);
    } catch (error) {
      console.error("Upload or processing failed", error);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  const renderDocumentAiResults = () => {
    if (!documentAiResults) return null;

    return (
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Document AI Results</h2>
        <div className="bg-gray-100 rounded-md p-4">
          {documentAiResults.menuItems?.map((item: any, index: number) => (
            <div key={index} className="mb-2">
              <strong>{item.name}</strong>: ${item.price}
              {item.description && (
                <p className="text-sm">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="my-2 flex-wrap text-5xl font-extrabold">
        <span className="pr-2 text-teal-600">Menu</span>
        <span className="text-teal-950">Analyzer</span>
      </h1>
      <div className="rounded-lg shadow-md p-6">
        <div className="mb-4">
          <label
            htmlFor="menuFile"
            className="block text-gray-700 font-bold mb-2"
          >
            Upload Menu Image
          </label>
          <input
            type="file"
            id="menuFile"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            className="border rounded-md py-2 px-3 w-full"
          />
        </div>
        <Button onClick={handleUploadAndProcess} disabled={!file || loading}>
          {loading ? "Processing..." : "Upload and Process"}
        </Button>
      </div>

      {menuImageUrl && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Uploaded Menu Image</h2>
          {menuImageUrl && (
            <Image
              src={menuImageUrl}
              alt="Menu"
              width={1000}
              height={500}
              className="max-w-full h-auto rounded-md"
            />
          )}
        </div>
      )}

      {renderDocumentAiResults()}
    </div>
  );
};

export default MenuUpload;

// "use client";

// import React, { useState } from "react";
// import { useAuth } from "@clerk/nextjs";
// import Image from "next/image";
// import { Button } from "@/components/ui/button";

// const MenuUpload: React.FC = () => {
//   const [file, setFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [menuImageUrl, setMenuImageUrl] = useState<string>("");
//   const [documentAiResults, setDocumentAiResults] = useState<any>(null);
//   const { getToken } = useAuth();

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files?.[0]) {
//       setFile(event.target.files[0]);
//       setDocumentAiResults(null);
//     }
//   };

//   const handleUploadAndProcess = async () => {
//   if (!file) return;
//   setLoading(true);
//   try {
//     // Get Clerk token for authentication
//     const token = await getToken();

//     if (!token) {
//       throw new Error("No token found");
//     }

//     console.log("Token:", token); // Add this line to debug

//     // Upload to Google Cloud Storage
//     const formData = new FormData();
//     formData.append("file", file);

//     const uploadResponse = await fetch("/api/upload-to-gcs", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//       body: formData,
//     });

//     if (!uploadResponse.ok) {
//       throw new Error("Failed to upload to Google Cloud Storage");
//     }

//     const { url } = await uploadResponse.json();
//     setMenuImageUrl(url);

//     // Process with Document AI
//     const processResponse = await fetch("/api/process-document-ai", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({ imageUrl: url }),
//     });

//     if (!processResponse.ok) {
//       throw new Error("Failed to process with Document AI");
//     }

//     const result = await processResponse.json();
//     setDocumentAiResults(result);
//   } catch (error) {
//     console.error("Upload or processing failed", error);
//   } finally {
//     setLoading(false);
//     setFile(null);
//   }
// };

//   // const handleUploadAndProcess = async () => {
//   //   if (!file) return;
//   //   setLoading(true);
//   //   try {
//   //     // Get Clerk token for authentication
//   //     const token = await getToken();

//   //     // Upload to Google Cloud Storage
//   //     const formData = new FormData();
//   //     formData.append("file", file);

//   //     const uploadResponse = await fetch("/api/upload-to-gcs", {
//   //       method: "POST",
//   //       headers: {
//   //         Authorization: `Bearer ${token}`,
//   //       },
//   //       body: formData,
//   //     });

//   //     if (!uploadResponse.ok) {
//   //       throw new Error("Failed to upload to Google Cloud Storage");
//   //     }

//   //     const { url } = await uploadResponse.json();
//   //     setMenuImageUrl(url);

//   //     // Process with Document AI
//   //     const processResponse = await fetch("/api/process-document-ai", {
//   //       method: "POST",
//   //       headers: {
//   //         "Content-Type": "application/json",
//   //         Authorization: `Bearer ${token}`,
//   //       },
//   //       body: JSON.stringify({ imageUrl: url }),
//   //     });

//   //     if (!processResponse.ok) {
//   //       throw new Error("Failed to process with Document AI");
//   //     }

//   //     const result = await processResponse.json();
//   //     setDocumentAiResults(result);
//   //   } catch (error) {
//   //     console.error("Upload or processing failed", error);
//   //   } finally {
//   //     setLoading(false);
//   //     setFile(null);
//   //   }
//   // };

//   const renderDocumentAiResults = () => {
//     if (!documentAiResults) return null;

//     // Adjust this based on your actual Document AI schema
//     return (
//       <div className="mt-6">
//         <h2 className="text-2xl font-bold mb-4">Document AI Results</h2>
//         <div className="bg-gray-100 rounded-md p-4">
//           {documentAiResults.menuItems?.map((item: any, index: number) => (
//             <div key={index} className="mb-2">
//               <strong>{item.name}</strong>: ${item.price}
//               {item.description && (
//                 <p className="text-sm">{item.description}</p>
//               )}
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6">
//       <h1 className="my-2 flex-wrap text-5xl font-extrabold">
//         <span className="pr-2 text-teal-600">Menu</span>
//         <span className="text-teal-950">Analyzer</span>
//       </h1>
//       <div className="rounded-lg shadow-md p-6">
//         <div className="mb-4">
//           <label
//             htmlFor="menuFile"
//             className="block text-gray-700 font-bold mb-2"
//           >
//             Upload Menu Image
//           </label>
//           <input
//             type="file"
//             id="menuFile"
//             accept="image/*"
//             onChange={handleFileChange}
//             disabled={loading}
//             className="border rounded-md py-2 px-3 w-full"
//           />
//         </div>
//         <Button onClick={handleUploadAndProcess} disabled={!file || loading}>
//           {loading ? "Processing..." : "Upload and Process"}
//         </Button>
//       </div>

//       {menuImageUrl && (
//         <div className="mt-6">
//           <h2 className="text-2xl font-bold mb-4">Uploaded Menu Image</h2>
//           <Image
//             src={menuImageUrl}
//             alt="Menu"
//             width={1000}
//             height={500}
//             className="max-w-full h-auto rounded-md"
//           />
//         </div>
//       )}

//       {renderDocumentAiResults()}
//     </div>
//   );
// };

// export default MenuUpload;

// Previous Code with OCR & Translate Button ---

// "use client";

// import React, { useState, useEffect } from "react";
// import { useAuth } from "@clerk/nextjs";
// import Image from "next/image";
// import { getAuth, signInWithCustomToken } from "firebase/auth";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { initializeApp, getApps } from "firebase/app";
// import { firebaseConfig } from "@/config/Firebase/firebaseConfig";
// import PerformOCRButton from "@/components/performOCR.button";
// import TranslateButton from "@/components/TranslateButton";
// import { Button } from "@/components/ui/button";
// import MenuItemsTable from "@/components/MenuItemsTable"; // Import the new component

// // Initialize Firebase app
// if (getApps().length === 0) {
//   initializeApp(firebaseConfig);
// }

// const MenuUpload: React.FC = () => {
//   const [file, setFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [menuImageUrl, setMenuImageUrl] = useState<string>("");
//   const [ocrResults, setOcrResults] = useState<string>("");
//   const [translation, setTranslation] = useState<string>("");
//   const [menuItems, setMenuItems] = useState([]); // State to hold structured menu items
//   const { getToken } = useAuth();

//   useEffect(() => {
//     const authenticateWithFirebase = async () => {
//       try {
//         const token = await getToken({ template: "integration_firebase" });
//         const auth = getAuth();
//         await signInWithCustomToken(auth, token);
//       } catch (error) {
//         console.error("Firebase Authentication Failed", error);
//       }
//     };

//     authenticateWithFirebase();
//   }, [getToken]);

//   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     if (event.target.files?.[0]) {
//       setFile(event.target.files[0]);
//       setOcrResults(""); // Reset OCR results
//       setTranslation(""); // Reset translation
//     }
//   };

//   const handleUpload = async () => {
//     if (!file) return;
//     setLoading(true);
//     const storage = getStorage();
//     const fileName = `original-menu/${new Date().toISOString()}_${file.name}`;
//     const storageRef = ref(storage, fileName);
//     try {
//       const snapshot = await uploadBytes(storageRef, file);
//       const downloadURL = await getDownloadURL(snapshot.ref);
//       setMenuImageUrl(downloadURL);
//       setOcrResults(""); // Reset OCR results
//       setTranslation(""); // Reset translation
//     } catch (error) {
//       console.error("Upload failed", error);
//     } finally {
//       setLoading(false);
//       setFile(null);
//     }
//   };

//   return (
//     <div className="max-w-5xl mx-auto p-6">
//       <h1 className="my-2 flex-wrap text-5xl font-extrabold">
//         <span className="pr-2 text-teal-600">Menu</span>
//         <span className="text-teal-950">Translator</span>
//       </h1>
//       <div className="rounded-lg shadow-md p-6">
//         <div className="mb-4">
//           <label
//             htmlFor="menuFile"
//             className="block text-gray-700 font-bold mb-2"
//           >
//             Upload Menu Image
//           </label>
//           <input
//             type="file"
//             id="menuFile"
//             accept="image/*"
//             onChange={handleFileChange}
//             disabled={loading}
//             className="border rounded-md py-2 px-3 w-full"
//           />
//         </div>
//         <button
//           onClick={handleUpload}
//           disabled={!file || loading}
//           className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
//             !file || loading ? "opacity-50 cursor-not-allowed" : ""
//           }`}
//         >
//           {loading ? "Uploading..." : "Upload"}
//         </button>
//       </div>

//       {menuImageUrl && (
//         <div className="mt-6">
//           <h2 className="text-2xl font-bold mb-4">Uploaded Menu Image</h2>
//           <Image
//             src={menuImageUrl}
//             alt="Menu"
//             width={1000}
//             height={500}
//             className="max-w-full h-auto rounded-md"
//           />
//           <PerformOCRButton
//             imageUrl={menuImageUrl}
//             setOcrResults={setOcrResults}
//             disabled={!menuImageUrl}
//           />
//         </div>
//       )}

//       {ocrResults && (
//         <div className="mt-6">
//           <h2 className="text-2xl font-bold mb-4">OCR Output</h2>
//           <pre className="bg-gray-100 rounded-md p-4 whitespace-pre-wrap">
//             {ocrResults}
//           </pre>
//           <TranslateButton
//             ocrText={ocrResults}
//             setTranslation={setTranslation}
//             disabled={!ocrResults}
//           />
//         </div>
//       )}

//       {translation && (
//         <div className="mt-6">
//           <h2 className="text-2xl font-bold mb-4">Translated Text</h2>
//           <pre className="bg-gray-100 rounded-md p-4 whitespace-pre-wrap">
//             {translation}
//           </pre>
//           <div className="bg-gray-100 rounded-md p-4">
//             <p>{translation}</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default MenuUpload;
