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
import { ChevronDown, ChevronUp, Star, ChefHat, AlertTriangle } from "lucide-react";


// Type definitions
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
  name: {
    original: string;
    pinyin?: string;
    english?: string;
  };
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

function hasEnglishProperty(value: any): value is { original: string; english?: string } {
  return typeof value === 'object' && value !== null && 'english' in value;
}

export function MenuDataDisplay({ menuData, menuName }: MenuDataDisplayProps) {
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [isRestaurantInfoOpen, setIsRestaurantInfoOpen] = useState(true); // Default open

   // Early return with styled message
   if (!menuData) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{menuName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <p className="text-lg">No menu data available.</p>
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
        : Object.values(category.items || {}).filter((item): item is MenuItem => 
            item !== null && typeof item === 'object')
    }));
  }, [menuData]);

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
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground capitalize">{key}:</span>
                <span className="font-medium text-green-600 dark:text-green-400">${value}</span>
              </div>
            ))}
        </div>
      );
    }
    return <span className="text-muted-foreground">Price not available</span>;
  };

  const renderAttributes = (item: MenuItem) => (
    <div className="flex flex-wrap gap-2">
      {item.popular && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Star className="h-3 w-3" /> Popular
        </Badge>
      )}
      {item.chef_recommended && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <ChefHat className="h-3 w-3" /> Chef's Choice
        </Badge>
      )}
      {item.spice_level && (
        <Badge variant="destructive" className="flex items-center gap-1">
          {"🌶️".repeat(Number(item.spice_level))}
        </Badge>
      )}
      {item.allergy_alert && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> {item.allergy_alert}
        </Badge>
      )}
    </div>
  );

  const renderRestaurantInfo = (info: RestaurantInfo) => (
    <Collapsible
      open={isRestaurantInfoOpen}
      onOpenChange={setIsRestaurantInfoOpen}
      className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>Restaurant Information</span>
          {info.name && typeof info.name === 'object' && (
            <Badge variant="outline">{info.name.english}</Badge>
          )}
        </h3>
        {isRestaurantInfoOpen ? <ChevronUp /> : <ChevronDown />}
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 space-y-3 border-t">
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(info)
            .filter(([_, value]) => value)
            .map(([key, value]) => (
              <div key={key} className="space-y-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                  {key.replace(/_/g, " ")}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {typeof value === "object" && value !== null
                    ? (
                      <div>
                        <div className="font-medium">{value.original}</div>
                        {value.english && (
                          <div className="text-muted-foreground">{value.english}</div>
                        )}
                      </div>
                    )
                    : value || "N/A"}
                </dd>
              </div>
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );


  const renderMenuItem = (
    item: MenuItem,
    categoryIndex: number,
    itemIndex: number,
    categoryName?: string
  ) => (
    <TableRow 
      key={`${categoryIndex}-${itemIndex}`}
      className="group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      {showFullMenu && categoryName && (
        <TableCell className="font-medium border-r">{categoryName}</TableCell>
      )}
      
      <TableCell className="min-w-[200px]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{item.name.original}</span>
            {item.popular && (
              <Badge variant="secondary" className="h-5">
                Popular
              </Badge>
            )}
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
  
      <TableCell className="whitespace-nowrap">
        {item.price ? (
          <div className="font-medium text-green-600 dark:text-green-400">
            ${item.price.amount} {item.price.currency}
          </div>
        ) : item.prices ? (
          <div className="space-y-1">
            {Object.entries(item.prices)
              .filter(([_, value]) => value && value !== "")
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground capitalize">
                    {key}:
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ${value}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">N/A</span>
        )}
      </TableCell>
  
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {item.chef_recommended && (
            <Badge variant="outline" className="bg-amber-50 border-amber-200">
              👨‍🍳 Chef's Choice
            </Badge>
          )}
          {item.spice_level && parseInt(item.spice_level) > 0 && (
            <Badge variant="outline" className="font-normal">
              {"🌶️".repeat(parseInt(item.spice_level))}
            </Badge>
          )}
          {item.allergy_alert && (
            <Badge variant="destructive" className="bg-yellow-50 text-yellow-800 border-yellow-200">
              ⚠️ {item.allergy_alert}
            </Badge>
          )}
        </div>
      </TableCell>
  
      <TableCell className="max-w-[300px]">
        {item.description && (
          <div className="space-y-1">
            {item.description.original && (
              <div className="text-sm">{item.description.original}</div>
            )}
            {item.description.english && (
              <div className="text-sm text-muted-foreground">
                {item.description.english}
              </div>
            )}
          </div>
        )}
      </TableCell>
  
      <TableCell className="min-w-[150px]">
        {item.upgrades && item.upgrades.length > 0 ? (
          <div className="space-y-1">
            {item.upgrades.map((upgrade, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{upgrade.name}</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  +${upgrade.price}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
  
      {showFullMenu && (
        <TableCell className="max-w-[200px]">
          {item.notes ? (
            <span className="text-sm">{item.notes}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
  

  const hasCategories = normalizedCategories.length > 0;
  const firstCategoryName = hasCategories ? normalizedCategories[0]?.name?.original : "";

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {menuName}
              {menuData.restaurant_info?.name && hasEnglishProperty(menuData.restaurant_info.name) && (
                <Badge variant="outline">{menuData.restaurant_info.name.english}</Badge>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showFullMenu"
                checked={showFullMenu}
                onCheckedChange={(checked) => setShowFullMenu(!!checked)}
                className="border-2"
              />
              <label htmlFor="showFullMenu" className="text-sm font-medium">
                Show full menu (including categories)
              </label>
            </div>
          </div>

          {menuData.restaurant_info && renderRestaurantInfo(menuData.restaurant_info)}

          <div className="rounded-lg border border-gray-200 dark:border-gray-800">
            {hasCategories ? (
              showFullMenu ? (
                <ScrollArea className="w-full border rounded-md">
                <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                      {showFullMenu && (
                        <TableHead className="font-semibold hidden md:table-cell w-[150px]">Category</TableHead>
                      )}
                      <TableHead className="font-semibold min-w-[200px] lg:min-w-[250px]">Name</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap min-w-[100px]">Price</TableHead>
                      <TableHead className="font-semibold hidden sm:table-cell min-w-[120px]">Features</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Description</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell min-w-[150px]">Upgrades</TableHead>
                      <TableHead className="font-semibold hidden xl:table-cell">Notes</TableHead>
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
                <Tabs defaultValue={firstCategoryName} className="w-full">
                  <TabsList className="flex flex-wrap gap-2 p-4 border-b">
                    {normalizedCategories.map((category) => (
                      <TabsTrigger
                        key={category.name.original}
                        value={category.name.original}
                        className="px-4 py-2 rounded-md data-[state=active]:bg-slate-200 data-[state=active]:text-slate-900"
                      >
                        <div className="text-center">
                          <div className="font-medium">{category.name.original}</div>
                          {category.name.english && (
                            <div className="text-xs opacity-70">
                              {category.name.english}
                            </div>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  <div className="p-4">
                    {normalizedCategories.map((category) => (
                      <TabsContent
                        key={category.name.original}
                        value={category.name.original}
                      >
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 dark:bg-gray-800">
                                <TableHead className="font-semibold min-w-[200px]">Name</TableHead>
                                <TableHead className="font-semibold">Price</TableHead>
                                <TableHead className="font-semibold">Features</TableHead>
                                <TableHead className="font-semibold">Description</TableHead>
                                <TableHead className="font-semibold">Upgrades</TableHead>
                                <TableHead className="font-semibold">Notes</TableHead>
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
                        </div>
                      </TabsContent>
                    ))}
                  </div>
                </Tabs>
              )
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No categories found in the menu data.
              </div>
            )}
          </div>

          {menuData.other_info && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Additional Information</CardTitle>
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