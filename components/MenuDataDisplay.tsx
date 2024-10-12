// components/MenuDataDisplay.tsx

'use client';

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";

// Define types for MenuData, MenuItem, Category, and RestaurantInfo here or import them

interface MenuItem {
  name: {
    original: string;
    pinyin?: string;
    english?: string;
  };
  description?: {
    original?: string;
    english?: string;
  } | null;
  price?: {
    amount: number;
    currency: string;
  };
  prices?: {
    [key: string]: string;
  };
  popular?: boolean;
  chef_recommended?: boolean;
  spice_level?: string;
  allergy_alert?: string;
  upgrades?: Array<{ name: string; price: string }>;
  notes?: string;
}

interface Category {
  name: {
    original: string;
    pinyin?: string;
    english?: string;
  };
  items: MenuItem[];
}

interface RestaurantInfo {
  name: { original: string; english?: string } | string;
  address?: { original: string; english?: string } | string;
  operating_hours?: string;
  phone_number?: string;
  website?: string;
  social_media?: string;
  description?: { original: string; english: string } | string;
  additional_notes?: string;
}

interface MenuData {
  restaurant_info: RestaurantInfo;
  categories: Category[];
  other_info?: string;
}

interface MenuDataDisplayProps {
  menuData: MenuData;
  menuName: string;
}

const MenuDataDisplay: React.FC<MenuDataDisplayProps> = ({
  menuData,
  menuName,
}) => {
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [isRestaurantInfoOpen, setIsRestaurantInfoOpen] = useState(false);

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
              ? `${(value as any).original || ""} ${
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
    categoryName?: string
  ) => {
    const priceDisplay = item.price
      ? `${item.price.amount} ${item.price.currency}`
      : item.prices
      ? Object.entries(item.prices)
          .filter(([_, value]) => value && value !== "")
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      : "N/A";

    return (
      <TableRow key={`${categoryIndex}-${itemIndex}`}>
        {showFullMenu && categoryName && <TableCell>{categoryName}</TableCell>}
        <TableCell>{item.name.original}</TableCell>
        <TableCell>{item.name.pinyin}</TableCell>
        <TableCell>{item.name.english}</TableCell>
        <TableCell>{priceDisplay}</TableCell>
        <TableCell>
          <>
            {item.popular && "⭐ Popular "}
            {item.chef_recommended && "👨‍🍳 Chef's Recommendation "}
            {item.spice_level && `🌶️`.repeat(parseInt(item.spice_level))}
            {item.allergy_alert && "⚠️ " + item.allergy_alert}
          </>
        </TableCell>
        <TableCell>{item.description?.english || ""}</TableCell>
        <TableCell>
          {item.upgrades && Array.isArray(item.upgrades) ? (
            item.upgrades.map((upgrade, index) => (
              <div key={index}>{`${upgrade.name}: ${upgrade.price}`}</div>
            ))
          ) : (
            <div>No upgrades available</div>
          )}
        </TableCell>
        <TableCell>{item.notes}</TableCell>
      </TableRow>
    );
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <CardTitle>{menuName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showFullMenu"
              checked={showFullMenu}
              onCheckedChange={(checked) => setShowFullMenu(!!checked)}
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
                      renderMenuItem(
                        item,
                        categoryIndex,
                        itemIndex,
                        `${category.name.original} ${
                          category.name.english
                            ? `(${category.name.english})`
                            : ""
                        }`
                      )
                    )
                  )}
                </TableBody>
              </Table>
            ) : (
              <div className="space-y-6">
                <Tabs defaultValue={menuData.categories[0].name.original}>
                  <TabsList className="flex flex-wrap gap-2 mb-6">
                    {menuData.categories.map((category) => (
                      <TabsTrigger
                        key={category.name.original}
                        value={category.name.original}
                        className="px-3 py-2 text-sm whitespace-normal text-center h-auto"
                      >
                        <span className="block">{category.name.original}</span>
                        {category.name.english && (
                          <span className="block text-xs text-muted-foreground">
                            ({category.name.english})
                          </span>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {menuData.categories.map((category, categoryIndex) => (
                    <TabsContent
                      key={category.name.original}
                      value={category.name.original}
                    >
                      <div className="overflow-x-auto">
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
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )
          ) : (
            <p>No categories found in the menu data.</p>
          )}

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
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuDataDisplay;
