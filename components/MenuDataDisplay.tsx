// components/MenuDataDisplay.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

// Type definitions
interface MenuName {
  original: string;
  pinyin?: string;
  english?: string;
}

interface MenuDescription {
  original?: string;
  english?: string;
}

interface MenuItem {
  name: MenuName;
  description?: MenuDescription | null;
  price?: {
    amount: number;
    currency: string;
  };
  prices?: {
    [key: string]: string | number;
  };
  popular?: boolean;
  chef_recommended?: boolean;
  spice_level?: string;
  allergy_alert?: string;
  upgrades?: Array<{ name: string; price: string }>;
  notes?: string;
}

interface Category {
  name: MenuName;
  items: MenuItem[] | { [key: string]: MenuItem };
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
  categories: Category[] | { [key: string]: Category };
  other_info?: string;
}

interface MenuDataDisplayProps {
  menuData?: MenuData | null;
  menuName: string;
}

// Type guard for English property
function hasEnglishProperty(value: any): value is { original: string; english?: string } {
  return typeof value === 'object' && value !== null && 'english' in value;
}

export function MenuDataDisplay({ menuData, menuName }: MenuDataDisplayProps) {
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [isRestaurantInfoOpen, setIsRestaurantInfoOpen] = useState(true);

  // Early return if no data
  if (!menuData) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{menuName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
            <p>No menu data available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normalize categories and items
  const normalizedCategories = useMemo(() => {
    const cats = Array.isArray(menuData.categories)
      ? menuData.categories
      : Object.values(menuData.categories || {});

    return cats.map(category => ({
      ...category,
      items: Array.isArray(category.items)
        ? category.items
        : Object.values(category.items || {})
    }));
  }, [menuData]);

  // Component helper functions
  const renderPrice = (item: MenuItem) => {
    if (item.price) {
      return (
        <div className="font-medium text-green-600 dark:text-green-400">
          ${item.price.amount} {item.price.currency}
        </div>
      );
    }
    if (item.prices) {
      return (
        <div className="space-y-1">
          {Object.entries(item.prices)
            .filter(([_, value]) => value && value !== "")
            .map(([key, value]) => (
              <div key={key} className="text-sm flex justify-between">
                <span className="text-muted-foreground capitalize">{key}:</span>
                <span className="font-medium text-green-600">${value}</span>
              </div>
            ))}
        </div>
      );
    }
    return null;
  };

  const renderFeatures = (item: MenuItem) => {
    const features = [];

    if (item.popular) {
      features.push(
        <Badge key="popular" variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          ⭐ Popular
        </Badge>
      );
    }

    if (item.chef_recommended) {
      features.push(
        <Badge key="chef" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          👨‍🍳 Chef's Choice
        </Badge>
      );
    }

    if (item.spice_level && parseInt(item.spice_level) > 0) {
      features.push(
        <Badge key="spice" variant="outline" className="bg-red-50 text-red-700 border-red-200">
          {"🌶️".repeat(parseInt(item.spice_level))}
        </Badge>
      );
    }

    return features.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">{features}</div>
    ) : null;
  };

  const renderDetails = (item: MenuItem) => {
    return (
      <div className="space-y-2">
        {item.description && (
          <div className="space-y-1">
            <div className="text-sm">{item.description.original}</div>
            {item.description.english && (
              <div className="text-sm text-muted-foreground">
                {item.description.english}
              </div>
            )}
          </div>
        )}
        
        {item.allergy_alert && (
          <div className="flex items-center gap-1.5 text-sm text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            {item.allergy_alert}
          </div>
        )}

        {item.notes && (
          <div className="text-sm text-muted-foreground border-t pt-2">
            {item.notes}
          </div>
        )}
      </div>
    );
  };

  // Restaurant info component
  const renderRestaurantInfo = (info: RestaurantInfo) => (
    <Collapsible
      open={isRestaurantInfoOpen}
      onOpenChange={setIsRestaurantInfoOpen}
      className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Restaurant Information</h3>
          {hasEnglishProperty(info.name) && (
            <Badge variant="outline" className="text-sm font-normal">
              {info.name.english}
            </Badge>
          )}
        </div>
        {isRestaurantInfoOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </CollapsibleTrigger>

      <CollapsibleContent className="p-4 border-t border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(info)
            .filter(([key, value]) => value && key !== 'validation_status')
            .map(([key, value]) => (
              <div key={key} className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="text-sm">
                  {typeof value === "object" && value !== null ? (
                    <div className="space-y-0.5">
                      <div className="font-medium">{value.original}</div>
                      {value.english && (
                        <div className="text-muted-foreground">{value.english}</div>
                      )}
                    </div>
                  ) : (
                    value || "N/A"
                  )}
                </dd>
              </div>
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  // Menu item component
  const renderMenuItem = (
    item: MenuItem,
    categoryIndex: number,
    itemIndex: number,
    categoryName?: string
  ) => (
    <TableRow 
      key={`${categoryIndex}-${itemIndex}`}
      className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
    >
      {/* Category column (only in full menu view) */}
      {showFullMenu && categoryName && (
        <TableCell className="font-medium border-r border-gray-100 dark:border-gray-800">
          {categoryName}
        </TableCell>
      )}

      {/* Name column */}
      <TableCell className="min-w-[200px]">
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <span className="font-medium">{item.name.original}</span>
            {renderFeatures(item)}
          </div>
          {item.name.english && (
            <div className="text-sm text-muted-foreground">
              {item.name.english}
            </div>
          )}
          {item.name.pinyin && (
            <div className="text-xs text-muted-foreground italic">
              {item.name.pinyin}
            </div>
          )}
        </div>
      </TableCell>

      {/* Price column */}
      <TableCell className="whitespace-nowrap">
        {renderPrice(item)}
      </TableCell>

      {/* Details column */}
      <TableCell className="max-w-[400px]">
        {renderDetails(item)}
      </TableCell>

      {/* Upgrades column */}
      <TableCell className="min-w-[150px]">
  {item.upgrades && item.upgrades.length > 0 ? (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">
        Available Upgrades:
      </div>
      {item.upgrades.map((upgrade, idx) => (
        <div key={idx} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{upgrade.name}</span>
          <span className="font-medium text-green-600">+${upgrade.price}</span>
        </div>
      ))}
    </div>
  ) : (
    <span className="text-sm text-muted-foreground">—</span>
  )}
</TableCell>
    </TableRow>
  );

  // Main component return
  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {menuName}
              {menuData.restaurant_info?.name && 
                hasEnglishProperty(menuData.restaurant_info.name) && (
                  <Badge variant="outline" className="ml-2">
                    {menuData.restaurant_info.name.english}
                  </Badge>
                )}
            </CardTitle>
            {menuData.restaurant_info?.description && 
              hasEnglishProperty(menuData.restaurant_info.description) && (
                <CardDescription>
                  {menuData.restaurant_info.description.english}
                </CardDescription>
              )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* View toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showFullMenu"
              checked={showFullMenu}
              onCheckedChange={(checked) => setShowFullMenu(!!checked)}
            />
            <label htmlFor="showFullMenu" className="text-sm font-medium">
              Show full menu (including categories)
            </label>
          </div>

          {/* Restaurant info */}
          {menuData.restaurant_info && renderRestaurantInfo(menuData.restaurant_info)}

          {/* Menu content */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800">
            {normalizedCategories.length > 0 ? (
              showFullMenu ? (
                // Full menu view
                <ScrollArea className="w-full">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                          <TableHead className="w-[180px] font-medium">Category</TableHead>
                          <TableHead className="min-w-[250px] font-medium">Item</TableHead>
                          <TableHead className="w-[120px] font-medium">Price</TableHead>
                          <TableHead className="min-w-[200px] font-medium">Details</TableHead>
                          <TableHead className="w-[150px] font-medium">Upgrades</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {normalizedCategories.flatMap((category, categoryIndex) =>
                          category.items.map((item, itemIndex) =>
                            renderMenuItem(
                              item,
                              categoryIndex,
                              itemIndex,
                              `${category.name.original} ${
                                category.name.english ? `(${category.name.english})` : ""
                              }`
                            )
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              ) : (
                // Categorized view
                <Tabs defaultValue={normalizedCategories[0]?.name.original} className="w-full">
                  <TabsList className="flex flex-wrap gap-2 p-4 border-b">
                    {normalizedCategories.map((category) => (
                      <TabsTrigger
                        key={category.name.original}
                        value={category.name.original}
                        className="px-4 py-2 rounded-md"
                      >
                        <div className="text-center">
                          <div className="font-medium">{category.name.original}</div>
                          {category.name.english && (
                            <div className="text-xs text-muted-foreground">
                              {category.name.english}
                            </div>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {normalizedCategories.map((category) => (
                    <TabsContent
                      key={category.name.original}
                      value={category.name.original}
                      className="p-4"
                    >
                      <ScrollArea className="w-full">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                              <TableHead className="min-w-[250px] font-medium">Item</TableHead>
                              <TableHead className="w-[120px] font-medium">Price</TableHead>
                              <TableHead className="min-w-[200px] font-medium">Details</TableHead>
                              <TableHead className="w-[150px] font-medium">Upgrades</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.items.map((item, itemIndex) =>
                              renderMenuItem(
                                item,
                                normalizedCategories.indexOf(category),
                                itemIndex
                              )
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              )
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No categories found in the menu data.
              </div>
            )}
          </div>

          {/* Additional information */}
          {menuData.other_info && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {menuData.other_info}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MenuDataDisplay;