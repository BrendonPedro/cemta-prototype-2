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

interface VertexAiResultsDisplayProps {
  userId: string;
  latestProcessingId: string | null;
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
  };
  prices: {
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
}) => {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMenuData, setEditedMenuData] = useState<MenuData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isRestaurantInfoOpen, setIsRestaurantInfoOpen] = useState(false);

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
          setMenuData(results.menuData);
          setEditedMenuData(results.menuData);
          setSelectedHistoryId(latestProcessingId);
          setSelectedCategories(
            results.menuData.categories.map((cat: Category) => cat.name)
          );
        } else {
          setError("No menu data found in the results.");
        }
      } catch (error) {
        console.error("Error fetching Vertex AI results:", error);
        setError("Failed to fetch Vertex AI results. Please try again.");
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
    categoryIndex: number,
    itemIndex: number,
    field: keyof MenuItem,
    value: string
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
        setSelectedCategories(
          results.menuData.categories.map((cat: Category) => cat.name)
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
        : [...prev, categoryName]
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
            item.prices.regular || Object.values(item.prices)[0] || "0"
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
                 value.english ? `(${value.english})` : ""
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
    categoryName?: string
  ) => (
    <TableRow key={`${categoryName || ''}-${itemIndex}`}>
      {showFullMenu && categoryName && (
        <TableCell>{categoryName}</TableCell>
      )}
      <TableCell>
        {isEditing ? (
          <Input
            value={item.name.original}
            onChange={(e) =>
              handleEdit(
                categoryIndex,
                itemIndex,
                "name",
                JSON.stringify({ ...item.name, original: e.target.value })
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
                JSON.stringify({ ...item.name, pinyin: e.target.value })
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
                JSON.stringify({ ...item.name, english: e.target.value })
              )
            }
          />
        ) : (
          item.name.english
        )}
      </TableCell>
      <TableCell>
        {item.prices && typeof item.prices === "object" ? (
          Object.entries(item.prices).map(([size, price]) =>
            price ? (
              <div key={size}>
                {isEditing ? (
                  <Input
                    value={`${size}: ${price}`}
                    onChange={(e) => {
                      const [newSize, newPrice] = e.target.value.split(":");
                      const updatedPrices = {
                        ...item.prices,
                        [newSize.trim()]: newPrice.trim(),
                      };
                      handleEdit(
                        categoryIndex,
                        itemIndex,
                        "prices",
                        JSON.stringify(updatedPrices)
                      );
                    }}
                  />
                ) : (
                  `${size}: ${price}`
                )}
              </div>
            ) : null
          )
        ) : (
          <div>No price information available</div>
        )}
      </TableCell>
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
                  checked ? "true" : "false"
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
                  checked ? "true" : "false"
                )
              }
            />{" "}
            Chef&apos;s Recommendation
            <br />
            <Input
              value={item.spice_level}
              onChange={(e) =>
                handleEdit(
                  categoryIndex,
                  itemIndex,
                  "spice_level",
                  e.target.value
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
                  e.target.value
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
            value={item.description.english}
            onChange={(e) =>
              handleEdit(
                categoryIndex,
                itemIndex,
                "description",
                JSON.stringify({ ...item.description, english: e.target.value })
              )
            }
          />
        ) : (
          item.description.english
        )}
      </TableCell>
      <TableCell>
        {item.upgrades.map((upgrade, index) => (
          <div key={index}>
            {isEditing ? (
              <Input
                value={`${upgrade.name}: ${upgrade.price}`}
                onChange={(e) => {
                  const [name, price] = e.target.value.split(":");
                  const newUpgrades = [...item.upgrades];
                  newUpgrades[index] = {
                    name: name.trim(),
                    price: price.trim(),
                  };
                  handleEdit(
                    categoryIndex,
                    itemIndex,
                    "upgrades",
                    JSON.stringify(newUpgrades)
                  );
                }}
              />
            ) : (
              `${upgrade.name}: ${upgrade.price}`
            )}
          </div>
        ))}
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

  if (isLoading) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Loading Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-8 mb-4" />
          <Skeleton className="w-full h-8 mb-4" />
          <Skeleton className="w-full h-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!menuData) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No menu data available. Please try processing the image again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>Vertex AI Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Select
            onValueChange={handleHistorySelect}
            value={selectedHistoryId || undefined}
          >
            <SelectTrigger className="w-full">
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="showFullMenu"
              checked={showFullMenu}
              onCheckedChange={(checked) => setShowFullMenu(checked as boolean)}
            />
            <label htmlFor="showFullMenu">
              Show full menu (including categories)
            </label>
          </div>

 {renderRestaurantInfo(menuData.restaurant_info)}

          {menuData.categories.length > 0 ? (
            showFullMenu ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Original Name</TableHead>
                    <TableHead>Pinyin</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Prices</TableHead>
                    <TableHead>Attributes</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Upgrades</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuData.categories.flatMap((category, categoryIndex) =>
                    category.items.map((item, itemIndex) =>
                      renderMenuItem(item, categoryIndex, itemIndex, `${category.name.original} ${category.name.english ? `(${category.name.english})` : ''}`)
                    )
                  )}
                </TableBody>
              </Table>
            ) : (
              <Tabs defaultValue={menuData.categories[0].name.original}>
                <TabsList>
                  {menuData.categories.map((category) => (
                    <TabsTrigger
                      key={category.name.original}
                      value={category.name.original}
                    >
                      {category.name.original} {category.name.english ? `(${category.name.english})` : ''}
                    </TabsTrigger>
                  ))}
                </TabsList>
              {menuData.categories.map((category, categoryIndex) => (
                <TabsContent
                  key={category.name.original}
                  value={category.name.original}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Original Name</TableHead>
                        <TableHead>Pinyin</TableHead>
                        <TableHead>English Name</TableHead>
                        <TableHead>Prices</TableHead>
                        <TableHead>Attributes</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Upgrades</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.items.map((item, itemIndex) =>
                        renderMenuItem(item, categoryIndex, itemIndex)
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
            )
          ) : (
            <p>No categories</p>
          )}

          <div className="text-right font-bold">
            Total for selected items: ${calculateTotal()}
          </div>

          {menuData.other_info && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{menuData.other_info}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave}>Save</Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedMenuData(menuData);
                  }}
                  variant="cemta"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VertexAiResultsDisplay;