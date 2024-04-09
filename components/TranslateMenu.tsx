// "use client";

// // components/TranslateMenu.tsx
// import React, { useState } from "react";
// import {
//   db,
//   translationClient,
//   storage,
// } from "@/config/Firebase/firebaseConfig";

// const TranslateMenu = () => {
//   const [menuId, setMenuId] = useState("");

//   const handleTranslate = async () => {
//     if (!menuId) return;

//     // Fetch menu data from Firestore
//     const menuDoc = await db.collection("menus").doc(menuId).get();
//     const menuData = menuDoc.data();

//     if (menuData) {
//       const { originalText, ocrReportUrl } = menuData;

//       // Translate detected text to English
//       const [englishTranslation] = await translationClient.translate(
//         originalText,
//         "en"
//       );

//       // Save translated report to Firebase Storage
//       const translatedReportRef = storage
//         .ref()
//         .child(`translated-reports/${menuId}_translated.txt`);
//       await translatedReportRef.putString(englishTranslation.text);
//       const translatedReportUrl = await translatedReportRef.getDownloadURL();

//       // Update Firestore with translated report URL
//       await db.collection("menus").doc(menuId).update({
//         englishTranslation: englishTranslation.text,
//         translatedReportUrl,
//       });
//     }

//     // Reset input field
//     setMenuId("");
//   };

//   return (
//     <div>
//       <input
//         type="text"
//         value={menuId}
//         onChange={(e) => setMenuId(e.target.value)}
//         placeholder="Enter menu ID"
//       />
//       <button onClick={handleTranslate}>Translate Menu</button>
//     </div>
//   );
// };

// export default TranslateMenu;

