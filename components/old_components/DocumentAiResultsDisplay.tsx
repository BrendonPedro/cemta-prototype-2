import React, { useState, useEffect } from "react";
import { Menu, MenuItem } from "@/types/menuTypes";
import { getDocumentAiResults } from "@/app/services/firebaseFirestore"; // You'll need to create this function

interface DocumentAiResultsDisplayProps {
  userId: string;
}

const DocumentAiResultsDisplay: React.FC<DocumentAiResultsDisplayProps> = ({
  userId,
}) => {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const fetchedMenu = await getDocumentAiResults(userId);
        setMenu(fetchedMenu);
      } catch (err) {
        setError("Failed to fetch menu data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [userId]);

  if (loading) {
    return <div>Loading menu data...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!menu || !menu.items || menu.items.length === 0) {
    return <div>No menu items found.</div>;
  }

  return (
    <div className="mt-6">
      <h2 className="text-2xl font-bold mb-4">Menu Items</h2>
      <div className="bg-gray-100 rounded-md p-4">
        {menu.items.map((item: MenuItem, index: number) => (
          <div key={index} className="mb-4 p-2 bg-white rounded shadow">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <p className="text-green-600 font-medium">
              $
              {typeof item.price === "number"
                ? item.price.toFixed(2)
                : item.price}
            </p>
            {item.description && (
              <p className="text-sm text-gray-600">{item.description}</p>
            )}
            {item.category && (
              <p className="text-xs text-gray-500 mt-1">
                Category: {item.category}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentAiResultsDisplay;
