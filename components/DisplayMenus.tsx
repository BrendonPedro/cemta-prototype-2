"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/config/Firebase/firebaseConfig";
import TranslateButton from "./TranslateButton";

const DisplayMenus = () => {
  const [menus, setMenus] = useState([]);

  useEffect(() => {
    // Fetch menus from Firestore and set state
    const unsubscribe = db.collection("menus").onSnapshot((snapshot) => {
      const menusData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMenus(menusData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-4">
      {menus.map((menu) => (
        <div key={menu.id} className="border p-4 rounded-lg">
          <h3 className="text-lg font-bold">{menu.name}</h3>
          {/* Display the OCR text, and if present, the translated text */}
          <p>{menu.detectedText}</p>
          {menu.translatedText ? (
            <p>{menu.translatedText}</p>
          ) : (
            <TranslateButton documentId={menu.id} />
          )}
        </div>
      ))}
    </div>
  );
};

export default DisplayMenus;
