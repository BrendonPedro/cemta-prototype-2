'use client';

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { firebaseConfig } from "@/config/firebaseConfig";
import { initializeApp, getApps } from "firebase/app";
import { Button } from "@/components/ui/button";
import DocumentAiResultsDisplay from "./DocumentAiResultsDisplay"; // Import the new component
import { saveDocumentAiResults } from "../app/services/firebaseFirestore";

// Define the types for Document AI results
interface MenuItem {
  name: string;
  price: string;
  description?: string;
}

interface DocumentAiResult {
  menuItems: MenuItem[];
}

// Initialize Firebase app
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const MenuUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const { getToken, userId } = useAuth();

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      try {
        const customToken = await getToken({
          template: "integration_firebase",
        });
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
        body: JSON.stringify({ imageUrl: url, userId }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to process with Document AI");
      }

      const result: DocumentAiResult = await processResponse.json();

      // Store results in Firestore
      await saveDocumentAiResults(userCredential.user.uid, url, result);
    } catch (error) {
      console.error("Upload or processing failed", error);
    } finally {
      setLoading(false);
      setFile(null);
    }
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
          <Image
            src={menuImageUrl}
            alt="Menu"
            width={500}
            height={500}
            className="max-w-full h-auto rounded-md"
          />
        </div>
      )}

      <DocumentAiResultsDisplay userId={userId as string} />
    </div>
  );
};

export default MenuUpload;

// ****THE ABOVE CODE EXPLAINED*****

// "use client";: This directive ensures that the file runs in the client environment.
// import React, { useState, useEffect } from "react";: Imports React and its hooks for state management and lifecycle methods.
// import Image from "next/image";: Imports the Next.js Image component for optimized image handling.
// import { useAuth } from "@clerk/nextjs";: Imports Clerk's useAuth hook for authentication.
// import { getAuth, signInWithCustomToken } from "firebase/auth";: Imports Firebase authentication methods.
// import { firebaseConfig } from "@/config/firebaseConfig";: Imports the Firebase configuration.
// import { initializeApp, getApp, getApps } from "firebase/app";: Imports Firebase app initialization methods.
// import { Button } from "@/components/ui/button";: Imports a custom Button component.

// **Firebase Initialization**

// if (getApps().length === 0) {
//   initializeApp(firebaseConfig);
// }
// The code initializes the Firebase app using the provided configuration. It checks if an app instance already exists

// **Component Definition**

// const MenuUpload = () => {
//   const [file, setFile] = useState<File | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
//   const [documentAiResults, setDocumentAiResults] = useState<any>(null);
//   const { getToken } = useAuth();
// useState hooks: These manage the state for the file, loading status, menu image URL, and Document AI results.
// useAuth hook: This gets the authentication functions from Clerk.

// **Firebase Authentication**

// useEffect(() => {
//   const authenticateWithFirebase = async () => {
//     try {
//       const customToken = await getToken({
//         template: "integration_firebase",
//       });
//       console.log("Retrieved custom token from Clerk:", customToken); // Log the token

//       if (!customToken) {
//         throw new Error("Authentication failed. Could not get custom token");
//       }

//       const auth = getAuth();
//       const userCredential = await signInWithCustomToken(auth, customToken);
//       console.log("Firebase Authentication Successful");

//       const idToken = await userCredential.user.getIdToken();
//       console.log("ID Token obtained:", idToken);
//     } catch (error) {
//       console.error("Firebase Authentication Failed", error);
//     }
//   };

//   authenticateWithFirebase();
// }, [getToken]);
// useEffect hook: This runs the authentication function when the component mounts.
// authenticateWithFirebase function: This gets a custom token from Clerk, uses it to sign in with Firebase, and then gets an ID token.

// **File Change Handler**

// const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//   if (e.target.files?.[0]) {
//     setFile(e.target.files[0]);
//   }
// };
// handleFileChange function: This updates the state with the selected file when the file input changes.

// **Upload and Process Handler**

// const handleUploadAndProcess = async () => {
//   if (!file) return;

//   setLoading(true);
//   try {
//     const customToken = await getToken({ template: "integration_firebase" });
//     console.log("Token for upload:", customToken); // Log the token for upload
//     if (!customToken) {
//       throw new Error("Authentication failed. Could not get custom token");
//     }

//     const auth = getAuth();
//     const userCredential = await signInWithCustomToken(auth, customToken);
//     const idToken = await userCredential.user.getIdToken();

//     const formData = new FormData();
//     formData.append("file", file);

//     const uploadResponse = await fetch("/api/upload-to-gcs", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${idToken}`,
//       },
//       body: formData,
//     });

//     if (!uploadResponse.ok) {
//       throw new Error("Failed to upload to Google Cloud Storage");
//     }

//     const { url } = await uploadResponse.json();
//     setMenuImageUrl(url);

//     const processResponse = await fetch("/api/process-document-ai", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${idToken}`,
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
// handleUploadAndProcess function: This handles uploading the file to Google Cloud Storage and processing it with Document AI.
// It gets the custom token and ID token.
// It uploads the file to Google Cloud Storage.
// It processes the uploaded file with Document AI and sets the results in the state.

// **Rendering the Component**

// const renderDocumentAiResults = () => {
//   if (!documentAiResults) return null;

//   return (
//     <div className="mt-6">
//       <h2 className="text-2xl font-bold mb-4">Document AI Results</h2>
//       <div className="bg-gray-100 rounded-md p-4">
//         {documentAiResults.menuItems?.map((item: any, index: number) => (
//           <div key={index} className="mb-2">
//             <strong>{item.name}</strong>: ${item.price}
//             {item.description && (
//               <p className="text-sm">{item.description}</p>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// return (
//   <div className="max-w-5xl mx-auto p-6">
//     <h1 className="my-2 flex-wrap text-5xl font-extrabold">
//       <span className="pr-2 text-teal-600">Menu</span>
//       <span className="text-teal-950">Analyzer</span>
//     </h1>
//     <div className="rounded-lg shadow-md p-6">
//       <div className="mb-4">
//         <label
//           htmlFor="menuFile"
//           className="block text-gray-700 font-bold mb-2"
//         >
//           Upload Menu Image
//         </label>
//         <input
//           type="file"
//           id="menuFile"
//           accept="image/*"
//           onChange={handleFileChange}
//           disabled={loading}
//           className="border rounded-md py-2 px-3 w-full"
//         />
//       </div>
//       <Button onClick={handleUploadAndProcess} disabled={!file || loading}>
//         {loading ? "Processing..." : "Upload and Process"}
//       </Button>
//     </div>

//     {menuImageUrl && (
//       <div className="mt-6">
//         <h2 className="text-2xl font-bold mb-4">Uploaded Menu Image</h2>
//         {menuImageUrl && (
//           <Image
//             src={menuImageUrl}
//             alt="Menu"
//             width={500}
//             height={500}
//             className="max-w-full h-auto rounded-md"
//           />
//         )}
//       </div>
//     )}

//     {renderDocumentAiResults()}
//   </div>
// );
// renderDocumentAiResults function: This renders the results from Document AI if available.
// return statement: This renders the main component structure, including the file input, upload button, uploaded image, and Document AI results.

// **Packages Used**
// react: A JavaScript library for building user interfaces.
// next/image: A Next.js component for optimized image handling.
// @clerk/nextjs: Clerk's Next.js integration for authentication.
// firebase/auth: Firebase's authentication module.
// firebase/app: Firebase's core module for app initialization.
// @/components/ui/button: A custom Button component.

// **Summary**
// The code initializes a Firebase app and sets up a Clerk-based authentication flow.
// It provides a component that allows users to upload an image file.
// The image file is uploaded to Google Cloud Storage.
// The uploaded image URL is processed using Google Cloud's Document AI.
// The results from Document AI are displayed in the UI.

//OLD CODE WITH OCR AND TRANSLATE API COMPONETS WE QUERY FROM

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
