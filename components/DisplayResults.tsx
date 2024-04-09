
// ### Step 6: Saving Translated Reports and Displaying Results

// After translation, save the translated text in a separate bucket (Firestore or Firebase Storage, based on your preference) and link it in your Firestore database alongside the original menu and OCR report. This might involve updating your Firestore document structure to include references to all related files (original, OCR, translation).

// ### Step 7: Display Component

// Create a component to display the results from Firestore. This component fetches the Firestore documents containing the links or text for the original menu, OCR report, and translated text, and displays them. Tailwind CSS can be used for styling this component.

// DisplayResults.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/config/Firebase/firebaseConfig';

const DisplayResults = () => {
  const [menus, setMenus] = useState([]);

  useEffect(() => {
    // Fetch data from Firestore
    const fetchMenus = async () => {
      const snapshot = await db.collection('menus').get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenus(docs);
    };

    fetchMenus();
  }, []);

  return (
    <div className="space-y-4">
      {menus.map((menu) => (
        <div key={menu.id} className="p-4 border border-gray-200 rounded">
          <p><strong>Original Menu:</strong> {menu.originalMenuUrl}</p>
          <p><strong>OCR Text:</strong> {menu.detectedText}</p>
          <p><strong>Translated Text:</strong> {menu.translatedText || 'Not translated yet'}</p>
          {/* Display links or actual content based on your storage strategy */}
        </div>
      ))}
    </div>
  );
};

export default DisplayResults;
