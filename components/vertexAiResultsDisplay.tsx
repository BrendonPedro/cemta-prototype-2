// components/vertexAiResultsDisplay.tsx

import React, { useState, useEffect, useMemo } from "react";
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

import MenuDataDisplay from "./MenuDataDisplay";
import type { 
  MenuData,
  MenuItem,
  Category,
  RestaurantInfo,
  MenuItemName,
  MenuDetails,
  MenuDescription
} from "@/app/services/menu/types";
import ValidationBadge from "@/app/shared/components/ValidationBadge";
import {
  HistoryItem,
} from "@/app/services/firebaseFirestore";

interface RawMenuItem {
  name: MenuItemName;
  description?: MenuDescription;
  prices?: {
    regular?: string;
    small?: string;
    medium?: string;
    large?: string;
    xl?: string;
  };
}

interface VertexAiResultsDisplayProps {
  userId: string;
  latestProcessingId: string | null;
  isCached: boolean;
  onReprocess: (id: string) => void;
  processingError: string | null;
  existingMenuInfo: MenuDetails | null;
  menuName: string;
}

function normalizeMenuData(data: any): MenuData {
  // Transform categories from object to array if needed
  const categories = Array.isArray(data.categories) 
    ? data.categories.map((category: any) => ({
        name: typeof category.name === 'string' 
          ? { original: category.name, english: '', pinyin: '' }
          : category.name,
        items: category.items.map((item: any) => ({
          name: typeof item.name === 'string'
            ? { original: item.name, english: '', pinyin: '' }
            : item.name,
          description: typeof item.description === 'string'
            ? { original: item.description, english: '' }
            : item.description,
          price: item.price ? {
            amount: Number(item.price.amount),
            currency: String(item.price.currency)
          } : undefined,
          // ... other item fields
        }))
      }))
    : [];

  return {
    restaurant_info: {
      name: typeof data.restaurant_info?.name === 'string' 
        ? { original: data.restaurant_info.name, english: '', pinyin: '' }
        : data.restaurant_info?.name || { original: '', english: '', pinyin: '' },
      address: typeof data.restaurant_info?.address === 'string'
        ? { original: data.restaurant_info.address, english: '', pinyin: '' }
        : data.restaurant_info?.address || { original: '', english: '', pinyin: '' },
      description: typeof data.restaurant_info?.description === 'string'
        ? { original: data.restaurant_info.description, english: '', pinyin: '' }
        : data.restaurant_info?.description || { original: '', english: '', pinyin: '' },
      operating_hours: data.restaurant_info?.operating_hours || '',
      phone_number: data.restaurant_info?.phone_number || '',
      website: data.restaurant_info?.website || '',
      social_media: data.restaurant_info?.social_media || '',
      additional_notes: data.restaurant_info?.additional_notes || '',
      validation_status: data.restaurant_info?.validation_status
    },
    categories,
    other_info: data.other_info || ''
  };
}

const OrderSummary: React.FC<{ total: string; itemCount: number }> = ({ total, itemCount }) => (
  <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-4">
    <div className="text-sm text-muted-foreground">
      Selected Items: {itemCount}
    </div>
    <div className="text-lg font-semibold">
      Total: ${total}
    </div>
  </div>
);

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
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        if (!latestProcessingId) return;

        const results = await getVertexAiResults(userId, latestProcessingId);
        
        if (results?.menuData) {
          const processedMenuData: MenuData = {
            restaurant_info: {
              ...results.menuData.restaurant_info,
              address: results.menuData.restaurant_info.address || {
                original: '',
                english: '',
                pinyin: ''
              },
              description: {
                original: results.menuData.restaurant_info.description?.original || '',
                english: results.menuData.restaurant_info.description?.english || ''
              }
            },
            categories: Array.isArray(results.menuData.categories) 
              ? results.menuData.categories.map(category => ({
                  ...category,
                  items: Array.isArray(category.items)
                    ? category.items.map((item: RawMenuItem) => ({
                        ...item,
                        prices: item.prices || { regular: '' },
                        description: item.description || { original: '', english: '' }
                      }))
                    : Object.values(category.items as Record<string, RawMenuItem>).map(item => ({
                        ...item,
                        prices: item.prices || { regular: '' },
                        description: item.description || { original: '', english: '' }
                      }))
                }))
              : [],
            items: results.menuData.items || [],
            other_info: (results.menuData.other_info || '').trim()
          };

          setMenuData(processedMenuData);
          setRestaurantInfo(processedMenuData.restaurant_info);
        } else {
          setError('No menu data available');
        }
      } catch (error) {
        console.error('Error fetching results:', error);
        setError('Failed to load menu data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (latestProcessingId) {
      fetchResults();
    }
  }, [userId, latestProcessingId]);

  const handleReprocess = () => {
    // Implement reprocessing logic here
    console.log("Reprocessing menu...");
  };

const handleEdit = (
  categoryIndex: number, 
  itemIndex: number, 
  field: keyof MenuItem, 
  value: string | boolean
) => {
  if (!editedMenuData) return;
  
  const newMenuData = { ...editedMenuData };
  const category = newMenuData.categories[categoryIndex];
  const item = category.items[itemIndex];

  switch (field) {
    case 'popular':
    case 'chef_recommended':
      (item as any)[field] = Boolean(value);
      break;
    case 'prices':
      item.prices = { regular: String(value) };
      break;
    default:
      (item as any)[field] = String(value);
  }

  setEditedMenuData(newMenuData);
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
            results.menuData.categories.map((cat: Category) => cat.name.original)
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
          if (item.prices?.regular) {
            const amount = Number(item.prices.regular);
            if (!isNaN(amount)) {
              total += amount;
            }
          }
        }
      });
    });
  
    return total.toFixed(2);
  }

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
    const priceDisplay = item.prices?.regular
      ? `$${item.prices.regular}`
      : item.prices
        ? Object.entries(item.prices)
            .filter(([_, value]) => value && value !== "")
            .map(([key, value]) => `${key}: $${value}`)
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
        <TableCell>
          <Checkbox
            checked={selectedItems.has(item.name.original)}
            onCheckedChange={(checked) => {
              const newSelectedItems = new Set(selectedItems);
              if (checked) {
                newSelectedItems.add(item.name.original);
              } else {
                newSelectedItems.delete(item.name.original);
              }
              setSelectedItems(newSelectedItems);
            }}
          />
        </TableCell>
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
                  e.target.value,
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
                  e.target.value,
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
                  e.target.value,
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
                    checked || false
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
                    checked || false
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
                  e.target.value,
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

  const handleSelectItem = (itemName: string, selected: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (selected) {
      newSelectedItems.add(itemName);
    } else {
      newSelectedItems.delete(itemName);
    }
    setSelectedItems(newSelectedItems);
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
  return (
    <div className="relative">
      <MenuDataDisplay
        menuData={menuData}
        menuName={menuName}
        onSelectItem={handleSelectItem}
        selectedItems={selectedItems}
      />
      
      {selectedItems.size > 0 && (
        <OrderSummary
          total={calculateTotal()}
          itemCount={selectedItems.size}
        />
      )}
    </div>
  );
};
export default VertexAiResultsDisplay;

