import React, { useEffect, useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/config/firebaseConfig";

interface MenuItem {
  name: string;
  price: string;
  description?: string;
}

interface DocumentAiResult {
  menuItems: MenuItem[];
}

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const DocumentAiResultsDisplay = ({ userId }: { userId: string }) => {
  const [results, setResults] = useState<DocumentAiResult | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const db = getFirestore();
      const userRef = doc(db, "menus", userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        setResults(userDoc.data()?.documentAiResults);
      }
    };

    fetchResults();
  }, [userId]);

  if (!results) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold mb-4">Document AI Results</h2>
      <div className="bg-gray-100 rounded-md p-4">
        {results.menuItems?.map((item, index) => (
          <div key={index} className="mb-2">
            <strong>{item.name}</strong>: ${item.price}
            {item.description && <p className="text-sm">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentAiResultsDisplay;
