// Core types for menu items and structure
export interface MenuItemName {
  original: string;
  english?: string;
  pinyin?: string;
}

export interface MenuDescription {
  original?: string;
  english?: string;
}

export interface MenuItemPrice {
  amount: number;
  currency: string;
}

export interface MenuItem {
  name: MenuItemName;
  description?: MenuDescription;
  price?: MenuItemPrice;
  prices?: { [key: string]: string }; // Changed from string | number to just string
  image_url?: string;
  dietary_info?: string[];
  sizes?: { [key: string]: string };
  popular?: boolean;
  chef_recommended?: boolean;
  spice_level?: string;
  allergy_alert?: string;
  upgrades?: Array<{ name: string; price: string }>;
  notes?: string;
}

export interface Category {
  name: MenuItemName;
  items: MenuItem[];
}

export interface RestaurantInfo {
  name: MenuItemName;
  address: MenuItemName;
  operating_hours?: string;
  phone_number?: string;
  website?: string;
  social_media?: string;
  description: MenuItemName;
  additional_notes?: string;
  validation_status?: "community" | "restaurant" | "validator" | "cemta";
}

export interface MenuData {
  restaurant_info: RestaurantInfo;
  categories: Category[];
  items?: MenuItem[];
  other_info?: string;
}

// Restaurant types
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  latitude: number;
  longitude: number;
  county: string;
  townName: string;
  menuCount: number;
  hasMenu?: boolean;
  menuId?: string;
  menuImageUrl?: string;
  imageUrl?: string;
  photoUrl?: string;
  photos?: string[];
  priceLevel?: string | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: OpeningHours | null;
  hasGoogleData?: boolean;
  hasYelpData?: boolean;
  yelpId?: string | null;
  yelpRating?: number | null;
  placeId?: string;
  lastYelpSync?: string;
  contribution?: boolean;
  hasDetailsFetched?: boolean;
  createdAt?: string;
  lastUpdated?: string;
}

// ... (rest of your existing types from restaurant/types.ts) 