// components/vertexAiResultsDisplay.tsx

import React, { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Menu } from "@/types/menuTypes"; // Adjust the import path as necessary
import MenuDataDisplay from "./MenuDataDisplay";

interface VertexAiResultsDisplayProps {
  userId: string;
  latestProcessingId: string | null;
  isCached: boolean;
  onReprocess: (id: string) => void;
  processingError: string | null;
  existingMenuInfo: any | null;
  menuName: string;
}

interface MenuItem {
  name: {
    original: string;
    pinyin: string;
    english: string;
  };
  description: {
    original: string;
    english: string;
  } | null;
  price?: {
    amount: number;
    currency: string;
  };
  prices?: {
    [key: string]: string;
  };
  popular: boolean;
  chef_recommended: boolean;
  spice_level: string;
  allergy_alert: string;
  upgrades: Array<{ name: string; price: string }>;
  notes: string;
}

interface Category {
  name: {
    original: string;
    pinyin: string;
    english: string;
  };
  items: MenuItem[];
}

interface RestaurantInfo {
  name: { original: string; english: string } | string;
  address: { original: string; english: string } | string;
  operating_hours: string;
  phone_number: string;
  website: string;
  social_media: string;
  description: { original: string; english: string } | string;
  additional_notes: string;
}

interface MenuData {
  restaurant_info: RestaurantInfo;
  categories: Category[];
  other_info: string;
}

interface HistoryItem {
  id: string;
  menuName: string;
  timestamp: string;
}

const VertexAiResultsDisplay: React.FC<VertexAiResultsDisplayProps> = ({
  userId,
  latestProcessingId,
  isCached,
  onReprocess,
  processingError,
  existingMenuInfo,
  menuName,
}) => {
  console.log("VertexAiResultsDisplay props:", {
    userId,
    latestProcessingId,
    isCached,
    processingError,
  });
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMenuData, setEditedMenuData] = useState<MenuData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isRestaurantInfoOpen, setIsRestaurantInfoOpen] = useState(false);
  const [alert, setAlert] = useState<{
    type: "default" | "destructive";
    message: string;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchResults = async () => {
      if (existingMenuInfo) {
        // Handle existing menu data
        setMenuData(existingMenuInfo.menuData);
        setEditedMenuData(existingMenuInfo.menuData);
        setSelectedHistoryId(existingMenuInfo.id);
        setLastUpdated(existingMenuInfo.timestamp);
        setAlert({
          type: "default",
          message: "This menu already exists in the database.",
        });
        setIsLoading(false);
      } else if (!latestProcessingId) {
        setIsLoading(false);
        setError(
          "No processing ID available. Please try processing the image again.",
        );
        return;
      } else {
        setIsLoading(true);
        setError(null);

        try {
          console.log("Fetching Vertex AI results...");
          const results = await getVertexAiResults(userId, latestProcessingId);
          console.log("Fetched results:", results);

          if (results && results.menuData) {
            setMenuData(results.menuData);
            setEditedMenuData(results.menuData);
            setSelectedHistoryId(latestProcessingId);
            setLastUpdated(results.timestamp || new Date().toISOString());

            if (Array.isArray(results.menuData.categories)) {
              setSelectedCategories(
                results.menuData.categories.map(
                  (cat: Category) => cat.name.original,
                ),
              );
            } else {
              console.error(
                "Invalid categories structure:",
                results.menuData.categories,
              );
              setError(
                "Unexpected data structure in results: categories is not an array.",
              );
            }

            if (isCached) {
              setAlert({
                type: "default",
                message:
                  "This menu data was retrieved from the cache. If you believe the data is stale, you can reprocess it.",
              });
            }
          } else {
            console.error("Invalid results structure:", results);
            setError(
              "No menu data found in the results or unexpected data structure.",
            );
          }
        } catch (error: any) {
          console.error("Error fetching Vertex AI results:", error);
          setError(
            `Failed to fetch Vertex AI results: ${error.message}. Please try again.`,
          );

          if (retryCount < 3) {
            console.log(`Retrying in 5 seconds... (Attempt ${retryCount + 1})`);
            setTimeout(() => {
              setRetryCount((prevCount) => prevCount + 1);
              fetchResults();
            }, 5000);
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchResults();
  }, [userId, latestProcessingId, isCached, retryCount, existingMenuInfo]);

  const handleReprocess = () => {
    // Implement reprocessing logic here
    console.log("Reprocessing menu...");
  };

  const handleEdit = (
    categoryIndex: number,
    itemIndex: number,
    field: keyof MenuItem,
    value: string,
  ) => {
    if (!editedMenuData) return;

    const updatedMenuData = { ...editedMenuData };
    const item = updatedMenuData.categories[categoryIndex].items[itemIndex];

    if (field === "name" || field === "description") {
      (item[field] as any) = JSON.parse(value);
    } else if (field === "prices") {
      item.prices = JSON.parse(value);
    } else if (field === "popular" || field === "chef_recommended") {
      (item as any)[field] = value === "true";
    } else {
      (item as any)[field] = value;
    }

    setEditedMenuData(updatedMenuData);
  };

  const handleSave = async () => {
    if (selectedHistoryId && editedMenuData) {
      await updateVertexAiResults(userId, selectedHistoryId, editedMenuData);
      setMenuData(editedMenuData);
      setIsEditing(false);
    }
  };

  const handleHistorySelect = async (value: string) => {
    setSelectedHistoryId(value);
    setIsLoading(true);
    try {
      const results = await getVertexAiResults(userId, value);
      if (results && results.menuData) {
        setMenuData(results.menuData);
        setEditedMenuData(results.menuData);

        if (Array.isArray(results.menuData.categories)) {
          setSelectedCategories(
            results.menuData.categories.map(
              (cat: Category) => cat.name.original,
            ),
          );
        } else {
          console.error(
            "Invalid categories structure:",
            results.menuData.categories,
          );
          setError(
            "Unexpected data structure in results: categories is not an array.",
          );
        }
      } else {
        console.error("Invalid results structure:", results);
        setError(
          "No menu data found in the results or unexpected data structure.",
        );
      }
    } catch (error) {
      console.error("Error fetching historical results:", error);
      setError("Failed to fetch historical results.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((cat) => cat !== categoryName)
        : [...prev, categoryName],
    );
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const calculateTotal = () => {
    if (!menuData) return "0.00";
    let total = 0;
    menuData.categories.forEach((category) => {
      category.items.forEach((item) => {
        if (selectedItems.has(item.name.original)) {
          const price = parseFloat(
            item.prices?.regular ||
              (item.prices && Object.values(item.prices)[0]) ||
              "0",
          );
          if (!isNaN(price)) {
            total += price;
          }
        }
      });
    });
    return total.toFixed(2);
  };

  const renderRestaurantInfo = (info: RestaurantInfo) => (
    <Collapsible
      open={isRestaurantInfoOpen}
      onOpenChange={setIsRestaurantInfoOpen}
      className="w-full"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-gray-100 hover:bg-gray-200 transition-colors">
        <h3 className="text-lg font-semibold">Restaurant Information</h3>
        {isRestaurantInfoOpen ? <ChevronUp /> : <ChevronDown />}
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 border border-t-0 border-gray-200">
        {Object.entries(info).map(([key, value]) => (
          <p key={key} className="mb-2">
            <strong>{key.replace(/_/g, " ")}:</strong>{" "}
            {typeof value === "object" && value !== null
              ? `${value.original || ""} ${
                  (value as any).english ? `(${(value as any).english})` : ""
                }`
              : value || "N/A"}
          </p>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  const renderMenuItem = (
    item: MenuItem,
    categoryIndex: number,
    itemIndex: number,
    categoryName?: string,
  ) => {
    const priceDisplay = item.price
      ? `${item.price.amount} ${item.price.currency}`
      : item.prices
        ? Object.entries(item.prices)
            .filter(([_, value]) => value && value !== "")
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ")
        : "N/A";
    // Add a check for empty categories
    if (!menuData?.categories || menuData.categories.length === 0) {
      return (
        <Card className="w-full mt-6">
          <CardHeader>
            <CardTitle>Menu Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              No categories or menu items found. The menu might be empty or the
              analysis might not have captured any items.
            </p>
            {menuData?.restaurant_info &&
              renderRestaurantInfo(menuData.restaurant_info)}
            {menuData?.other_info && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{menuData.other_info}</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <TableRow key={`${categoryIndex}-${itemIndex}`}>
        {showFullMenu && categoryName && <TableCell>{categoryName}</TableCell>}
        <TableCell>
          {isEditing ? (
            <Input
              value={item.name.original}
              onChange={(e) =>
                handleEdit(
                  categoryIndex,
                  itemIndex,
                  "name",
                  JSON.stringify({ ...item.name, original: e.target.value }),
                )
              }
            />
          ) : (
            item.name.original
          )}
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              value={item.name.pinyin}
              onChange={(e) =>
                handleEdit(
                  categoryIndex,
                  itemIndex,
                  "name",
                  JSON.stringify({ ...item.name, pinyin: e.target.value }),
                )
              }
            />
          ) : (
            item.name.pinyin
          )}
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              value={item.name.english}
              onChange={(e) =>
                handleEdit(
                  categoryIndex,
                  itemIndex,
                  "name",
                  JSON.stringify({ ...item.name, english: e.target.value }),
                )
              }
            />
          ) : (
            item.name.english
          )}
        </TableCell>
        <TableCell>{priceDisplay}</TableCell>
        <TableCell>
          {isEditing ? (
            <>
              <Checkbox
                checked={item.popular}
                onCheckedChange={(checked) =>
                  handleEdit(
                    categoryIndex,
                    itemIndex,
                    "popular",
                    checked ? "true" : "false",
                  )
                }
              />{" "}
              Popular
              <br />
              <Checkbox
                checked={item.chef_recommended}
                onCheckedChange={(checked) =>
                  handleEdit(
                    categoryIndex,
                    itemIndex,
                    "chef_recommended",
                    checked ? "true" : "false",
                  )
                }
              />{" "}
              Chef Recommendation
              <br />
              <Input
                value={item.spice_level}
                onChange={(e) =>
                  handleEdit(
                    categoryIndex,
                    itemIndex,
                    "spice_level",
                    e.target.value,
                  )
                }
              />{" "}
              Spice Level
              <br />
              <Input
                value={item.allergy_alert}
                onChange={(e) =>
                  handleEdit(
                    categoryIndex,
                    itemIndex,
                    "allergy_alert",
                    e.target.value,
                  )
                }
              />{" "}
              Allergy Alert
            </>
          ) : (
            <>
              {item.popular && "⭐ Popular "}
              {item.chef_recommended && "👨‍🍳 Chef's Recommendation "}
              {item.spice_level && `🌶️`.repeat(parseInt(item.spice_level))}
              {item.allergy_alert && "⚠️ " + item.allergy_alert}
            </>
          )}
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              value={item.description?.english || ""}
              onChange={(e) =>
                handleEdit(
                  categoryIndex,
                  itemIndex,
                  "description",
                  JSON.stringify({
                    ...item.description,
                    english: e.target.value,
                  }),
                )
              }
            />
          ) : (
            item.description?.english || ""
          )}
        </TableCell>
        <TableCell>
          {item.upgrades && Array.isArray(item.upgrades) ? (
            item.upgrades.map((upgrade, index) => (
              <div key={index}>
                {isEditing ? (
                  <Input
                    value={`${upgrade.name}: ${upgrade.price}`}
                    onChange={(e) => {
                      const [name, price] = e.target.value.split(":");
                      const newUpgrades = [...(item.upgrades || [])];
                      newUpgrades[index] = {
                        name: name.trim(),
                        price: price.trim(),
                      };
                      handleEdit(
                        categoryIndex,
                        itemIndex,
                        "upgrades",
                        JSON.stringify(newUpgrades),
                      );
                    }}
                  />
                ) : (
                  `${upgrade.name}: ${upgrade.price}`
                )}
              </div>
            ))
          ) : (
            <div>No upgrades available</div>
          )}
        </TableCell>
        <TableCell>
          {isEditing ? (
            <Input
              value={item.notes}
              onChange={(e) =>
                handleEdit(categoryIndex, itemIndex, "notes", e.target.value)
              }
            />
          ) : (
            item.notes
          )}
        </TableCell>
      </TableRow>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Loading Results for {menuName}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-8 mb-4" />
          <Skeleton className="w-full h-8 mb-4" />
          <Skeleton className="w-full h-8" />
        </CardContent>
      </Card>
    );
  }

  if (processingError) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Processing Error for {menuName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{processingError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!menuData) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>No Data Available for {menuName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No menu data available. Please try processing the image again.</p>
        </CardContent>
      </Card>
    );
  }

  return <MenuDataDisplay menuData={menuData} menuName={menuName} />;
};
export default VertexAiResultsDisplay;
