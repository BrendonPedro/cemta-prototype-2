import React, { useState, useEffect } from "react";
import {
  getVertexAiResults,
  updateVertexAiResults,
  getVertexAiHistory,
} from "@/app/services/firebaseFirestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface VertexAiResultsDisplayProps {
  userId: string;
  latestProcessingId: string | null;
}

interface MenuItem {
  original: string;
  pinyin: string;
  english: string;
  price: string;
}

interface MenuData {
  [category: string]: MenuItem[];
}

const VertexAiResultsDisplay: React.FC<VertexAiResultsDisplayProps> = ({
  userId,
  latestProcessingId,
}) => {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<
    { id: string; menuName: string; timestamp: string }[]
  >([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

   useEffect(() => {
     const fetchResults = async () => {
       if (!latestProcessingId) {
         setIsLoading(false);
         setError(
           "No processing ID available. Please try processing the image again."
         );
         return;
       }

       setIsLoading(true);
       setError(null);

       try {
         const results = await getVertexAiResults(userId, latestProcessingId);
         if (results && results.menuData) {
           const parsedMenuData = JSON.parse(results.menuData);
           if (Object.keys(parsedMenuData).length === 0) {
             setError(
               "No menu data found in the results. The AI might not have detected any menu items."
             );
           } else {
             setMenuData(parsedMenuData);
           }
           setSelectedHistoryId(latestProcessingId);
         } else {
           setError("No menu data found in the results.");
         }
       } catch (error) {
         console.error("Error fetching Vertex AI results:", error);
         setError(
           `Failed to fetch Vertex AI results: ${
             error instanceof Error ? error.message : String(error)
           }`
         );
       } finally {
         setIsLoading(false);
       }
     };

     const fetchHistory = async () => {
       try {
         const historyData = await getVertexAiHistory(userId);
         setHistory(historyData);
       } catch (error) {
         console.error("Error fetching history:", error);
       }
     };

     fetchResults();
     fetchHistory();
   }, [userId, latestProcessingId]);

  const handleEdit = (
    category: string,
    index: number,
    field: keyof MenuItem,
    value: string
  ) => {
    if (!menuData) return;
    const newMenuData = { ...menuData };
    newMenuData[category][index][field] = value;
    setMenuData(newMenuData);
  };

  const handleSave = async () => {
    if (selectedHistoryId && menuData) {
      await updateVertexAiResults(
        userId,
        selectedHistoryId,
        JSON.stringify(menuData)
      );
      setIsEditing(false);
    }
  };

  const handleHistorySelect = async (value: string) => {
    setSelectedHistoryId(value);
    setIsLoading(true);
    try {
      const results = await getVertexAiResults(userId, value);
      if (results && results.menuData) {
        setMenuData(JSON.parse(results.menuData));
      }
    } catch (error) {
      console.error("Error fetching historical results:", error);
      setError("Failed to fetch historical results.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!menuData) {
    return (
      <Alert>
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>
          No menu data available. Please try processing the image again.
        </AlertDescription>
      </Alert>
    );
  }

  const categories = ["all", ...Object.keys(menuData)];

  const filteredData =
    selectedCategory === "all"
      ? Object.entries(menuData).flatMap(([category, items]) =>
          items.map((item) => ({ ...item, category }))
        )
      : menuData[selectedCategory].map((item) => ({
          ...item,
          category: selectedCategory,
        }));

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Vertex AI Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center">
          <Select
            onValueChange={handleHistorySelect}
            value={selectedHistoryId || undefined}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select historical result" />
            </SelectTrigger>
            <SelectContent>
              {history.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.menuName} - {new Date(item.timestamp).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedCategory} value={selectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Original</TableHead>
              <TableHead>Pinyin</TableHead>
              <TableHead>English</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.category}</TableCell>
                {(["original", "pinyin", "english", "price"] as const).map(
                  (field) => (
                    <TableCell key={field}>
                      {isEditing ? (
                        <Input
                          value={item[field]}
                          onChange={(e) =>
                            handleEdit(
                              item.category,
                              index,
                              field,
                              e.target.value
                            )
                          }
                        />
                      ) : (
                        item[field]
                      )}
                    </TableCell>
                  )
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex justify-end">
          {isEditing ? (
            <>
              <Button onClick={handleSave} className="mr-2">
                Save
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="cemta">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VertexAiResultsDisplay;
