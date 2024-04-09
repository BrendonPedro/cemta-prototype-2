// "use client";

// // components/MenuDisplay.tsx
// import { useState, useEffect } from "react";
// import { db } from "@/config/Firebase/firebaseConfig";

// interface Menu {
//   id: string;
//   originalText: string;
//   englishTranslation: string;
//   originalMenuUrl: string;
//   ocrReportUrl: string;
//   translatedReportUrl: string;
// }

// const MenuDisplay = () => {
//   const [menus, setMenus] = useState<Menu[]>([]);

//   useEffect(() => {
//     const unsubscribe = db.collection("menus").onSnapshot((snapshot) => {
//       const menuData = snapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...doc.data(),
//       })) as Menu[];
//       setMenus(menuData);
//     });

//     return () => unsubscribe();
//   }, []);

//   return (
//     <div>
//       <h2>Menu Translations</h2>
//       {menus.map((menu) => (
//         <div key={menu.id}>
//           <h3>Original Menu</h3>
//           <a
//             href={menu.originalMenuUrl}
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             View Original Menu
//           </a>
//           <h3>OCR Report</h3>
//           <a href={menu.ocrReportUrl} target="_blank" rel="noopener noreferrer">
//             View OCR Report
//           </a>
//           <h3>Original Text</h3>
//           <p>{menu.originalText}</p>
//           <h3>English Translation</h3>
//           <p>{menu.englishTranslation || "Not translated yet"}</p>
//           {menu.translatedReportUrl && (
//             <a
//               href={menu.translatedReportUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//             >
//               View English Translation Report
//             </a>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// };

// export default MenuDisplay;
