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
import { ChevronDown, ChevronUp, AlertTriangle, Phone, Clock, MapPin, Globe } from "lucide-react";
import type { 
  MenuItem, 
  Category, 
  MenuData,
  MenuItemName 
} from "@/app/services/menu/types";

interface MenuDataDisplayProps {
  menuData: MenuData | null;
  menuName: string;
  onSelectItem?: (itemName: string, selected: boolean) => void;
  selectedItems?: Set<string>;
}

/**
 * Type guard to check if a value has an English translation property
 * @param value - The value to check
 * @returns boolean indicating if the value has an english property
 */
function hasEnglishProperty(value: any): value is { original: string; english?: string } {
  return typeof value === 'object' && value !== null && 'english' in value;
}

/**
 * Add this helper function at the top
 * @param value - The value to ensure is an array
 * @returns The value as an array
 */
function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * MenuDataDisplay Component
 * Displays restaurant menu data in both categorized and full menu views
 */
const MenuDataDisplay: React.FC<MenuDataDisplayProps> = ({
  menuData,
  menuName,
  onSelectItem,
  selectedItems = new Set()
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  if (!menuData) {
    return (
      <div className="p-4">
        <p>No menu data available</p>
      </div>
    );
  }

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const renderMenuItem = (item: MenuItem) => (
    <div className="flex items-center gap-2 py-2">
      {onSelectItem && (
        <Checkbox
          checked={selectedItems.has(item.name.original)}
          onCheckedChange={(checked) => {
            onSelectItem(item.name.original, !!checked);
          }}
        />
      )}
      <div className="flex-1">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-grow space-y-1">
            <div className="font-medium flex items-center gap-2">
              {item.name.original}
              {item.popular && <span title="Popular">⭐</span>}
              {item.chef_recommended && <span title="Chef's Recommendation">👨‍🍳</span>}
              {item.spice_level && <span title={`Spice Level: ${item.spice_level}`}>{'🌶️'.repeat(parseInt(item.spice_level))}</span>}
              {item.allergy_alert && <span title={`Allergy Alert: ${item.allergy_alert}`}>⚠️</span>}
            </div>
            {/* Display English and Pinyin translations */}
            <div className="text-sm text-muted-foreground space-y-0.5">
              {item.name.english && (
                <div>{item.name.english}</div>
              )}
              {item.name.pinyin && (
                <div className="italic">{item.name.pinyin}</div>
              )}
            </div>
            {/* Display description in original and English */}
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {item.description.original && (
                  <span className="block">{item.description.original}</span>
                )}
                {item.description.english && (
                  <span className="block">{item.description.english}</span>
                )}
              </p>
            )}
          </div>
          {item.prices?.regular && (
            <div className="text-right font-medium whitespace-nowrap">
              ${item.prices.regular}
            </div>
          )}
        </div>
        {item.upgrades && item.upgrades.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            <div className="font-medium">Upgrades:</div>
            <ul className="list-disc list-inside">
              {item.upgrades.map((upgrade, index) => (
                <li key={index}>
                  {upgrade.name}: ${upgrade.price}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const hasCategories = menuData.categories && menuData.categories.length > 0;
  const hasItems = menuData.items && menuData.items.length > 0;
  const categoriesArray = menuData.categories || [];

  return (
    <div className="space-y-4">
      {/* Display categorized items */}
      {hasCategories && categoriesArray.map((category, index) => (
        <Card key={`${category.name.original}-${index}`} className="overflow-hidden">
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors py-3"
            onClick={() => toggleCategory(category.name.original)}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold">{category.name.original}</div>
                {(category.name.english || category.name.pinyin) && (
                  <div className="text-sm text-muted-foreground">
                    {category.name.english}
                    {category.name.pinyin && (
                      <span className="italic ml-2">({category.name.pinyin})</span>
                    )}
                  </div>
                )}
              </div>
              {expandedCategories.has(category.name.original) ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>

          {expandedCategories.has(category.name.original) && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {category.items?.map((item: MenuItem, itemIndex: number) => (
                  <div
                    key={`${item.name.original}-${itemIndex}`}
                    className="border-t first:border-t-0 border-border"
                  >
                    {renderMenuItem(item)}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Display uncategorized items */}
      {hasItems && menuData.items && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-accent/50 transition-colors py-3"
            onClick={() => toggleCategory('uncategorized')}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">Other Items</div>
              {expandedCategories.has('uncategorized') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>

          {expandedCategories.has('uncategorized') && (
            <CardContent className="pt-0">
              <div className="space-y-3">
                {menuData.items.map((item: MenuItem, index: number) => (
                  <div
                    key={`uncategorized-${index}`}
                    className="border-t first:border-t-0 border-border"
                  >
                    {renderMenuItem(item)}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default MenuDataDisplay;

/**
 * Component Summary:
 * 
 * Purpose:
 * - Displays restaurant menu data in an interactive and organized format
 * - Supports both categorized and full menu views
 * - Handles multilingual content (original text, English translations, pinyin)
 * 
 * Key Features:
 * - Toggle between full menu and categorized views
 * - Collapsible restaurant information section
 * - Support for item features (popular, chef recommended, spice level)
 * - Price display with multiple pricing options
 * - Upgrade options display
 * - Responsive design with horizontal scrolling for wide content
 * 
 * Dependencies:
 * - Uses shadcn/ui components for UI elements
 * - Requires Lucide icons
 * - Expects specific data structure from parent component
 * 
 * Related Components:
 * - Card, Table, Tabs, and other UI components from @/components/ui/*
 * - Should be used within a parent component that provides MenuData
 * 
 * Optimization Notes:
 * - Uses useMemo for category normalization
 * - Implements early return for null data
 * - Modular rendering functions for better maintainability
 * 
 * Suggested Improvements:
 * - Consider moving types to a separate types.ts file
 * - Add error boundaries for better error handling
 * - Implement virtualization for large menus
 * - Add loading states for async data
 */