import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchRestaurants } from "@/app/services/firebaseFirestore";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import type { Restaurant } from "@/app/services/restaurant/types";

interface SearchRestaurantsProps {
  onRestaurantSelect?: (restaurant: Restaurant) => void;
  className?: string;
}

export function SearchRestaurants({ onRestaurantSelect, className }: SearchRestaurantsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchRestaurants(query);
      setResults(searchResults as Restaurant[]);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelect = (restaurant: Restaurant) => {
    setSearchQuery("");
    setResults([]);
    if (onRestaurantSelect) {
      onRestaurantSelect(restaurant);
    } else {
      router.push(`/restaurants/${restaurant.id}`);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Command className="rounded-lg border shadow-md">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            placeholder="Search restaurants..."
            value={searchQuery}
            onValueChange={handleSearch}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isSearching && (
            <div className="mr-2 animate-spin">⌛</div>
          )}
        </div>
        {searchQuery.length > 0 && (
          <CommandList>
            <CommandEmpty>No restaurants found.</CommandEmpty>
            <CommandGroup heading="Restaurants">
              {results.map((restaurant) => (
                <CommandItem
                  key={restaurant.id}
                  value={restaurant.id}
                  onSelect={() => handleSelect(restaurant)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{restaurant.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {restaurant.address}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
} 