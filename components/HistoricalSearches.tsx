// app/(marketing)/cemtaTeam/menuAnalyzer/HistoricalSearches.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getVertexAiHistory, getVertexAiResults } from "@/app/services/firebaseFirestore";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

interface HistoricalSearch {
  id: string;
  menuName: string;
  timestamp: string;
  restaurantName: string;
  score?: number;
}

interface HistoricalSearchesProps {
  onReprocess: (id: string) => void;
}

const HistoricalSearches: React.FC<HistoricalSearchesProps> = ({
  onReprocess,
}) => {
  const { userId } = useAuth();
  const [historicalSearches, setHistoricalSearches] = useState<
    HistoricalSearch[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Add this line

  const calculateScore = (menuData: any) => {
    // Implement a scoring algorithm based on menu completeness, details, etc.
    // This is a placeholder implementation
    let score = 0;
    if (menuData.restaurant_info) score += 20;
    if (menuData.categories && menuData.categories.length > 0) {
      score += Math.min(menuData.categories.length * 5, 30);
      menuData.categories.forEach((category: any) => {
        if (category.items && category.items.length > 0) {
          score += Math.min(category.items.length, 10);
        }
      });
    }
    return Math.min(score, 100);
  };

  const updateHistoricalSearches = useCallback(
    async (latestProcessingId: string) => {
      if (!userId) return;
      try {
        const result = await getVertexAiResults(userId, latestProcessingId);
        console.log("Fetched result:", JSON.stringify(result, null, 2));
        if (result && result.menuData) {
          const menuData = result.menuData;
          console.log("Parsed menuData:", JSON.stringify(menuData, null, 2));
          setHistoricalSearches((prev) => [
            {
              id: latestProcessingId,
              menuName: latestProcessingId,
              timestamp: result.timestamp || new Date().toISOString(),
              restaurantName:
                menuData.restaurant_info?.name?.original ||
                "Unknown Restaurant",
              score: calculateScore(menuData),
            },
            ...prev.slice(0, 9),
          ]);
        } else {
          console.log(
            "No result or menuData found for latestProcessingId:",
            latestProcessingId
          );
        }
      } catch (error) {
        console.error("Error in updateHistoricalSearches:", error);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) return;

    const fetchHistoricalSearches = async () => {
      try {
        const history = await getVertexAiHistory(userId);
        console.log("Fetched history:", history); // Add this line
        const detailedHistory = await Promise.all(
          history.map(async (item) => {
            const result = await getVertexAiResults(userId, item.id);
            console.log("Fetched result for item:", item.id, result); // Add this line
            const menuData = result?.menuData || {};
            return {
              ...item,
              restaurantName:
                result?.menuData?.restaurant_info?.name?.original ||
                "Unknown Restaurant",
              score: calculateScore(menuData),
            };
          })
        );
        setHistoricalSearches(detailedHistory);
        setIsLoading(false);
      } catch (error) {
        console.error("Error in fetchHistoricalSearches:", error); // Add this line
        setError("Failed to fetch historical searches. Please try again.");
        setIsLoading(false);
      }
    };

    fetchHistoricalSearches();

    // Set up a listener for real-time updates
    const userRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const latestProcessingId = doc.data()?.latestVertexAiProcessingId;
        if (latestProcessingId) {
          updateHistoricalSearches(latestProcessingId);
        }
      }
    });

    return () => unsubscribe();
  }, [userId, updateHistoricalSearches]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Searches</CardTitle>
        </CardHeader>
        <CardContent>
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="w-full h-12 mb-2" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Searches</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {historicalSearches.map((search) => (
            <li
              key={`${search.id}_${search.timestamp}`}
              className="bg-gray-100 p-2 rounded flex justify-between items-center"
            >
              <div>
                <span className="font-medium">{search.restaurantName}</span>
                <span className="ml-2 text-sm text-gray-600">
                  Score: {search.score}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {new Date(search.timestamp).toLocaleString()}
                </span>
              </div>
              <Link href={`/menu-details/${search.id}`}>
                <Button variant="cemta" size="sm">
                  Open
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default HistoricalSearches;
