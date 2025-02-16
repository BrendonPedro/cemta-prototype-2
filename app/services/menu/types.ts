
// Core menu item types
export interface MenuItemName {
  original: string;
  english?: string;
  pinyin?: string;
}

export interface MenuDescription {
  original: string;
  english?: string;
}

export interface MenuItem {
  name: MenuItemName;
  description?: MenuDescription;
  prices?: {
    regular?: string;
    small?: string;
    medium?: string;
    large?: string;
    xl?: string;
    currency?: string;
  };
  image_url?: string;
  dietary_info?: string[];
  popular?: boolean;
  chef_recommended?: boolean;
  spice_level?: string;
  allergy_alert?: string;
  upgrades?: Array<{
    name: string;
    price: string;
  }>;
  notes?: string;
}

export interface Category {
  name: MenuItemName;
  items: MenuItem[];
}

// Restaurant info types
export interface RestaurantInfo {
  name: MenuItemName;
  address: MenuItemName;
  operating_hours?: string;
  phone_number?: string;
  website?: string;
  social_media?: string;
  description: MenuDescription;
  additional_notes?: string;
  validation_status?: "community" | "restaurant" | "validator" | "cemta";
}

// Menu data types
export type MenuData = {
  restaurant_info: RestaurantInfo;
  categories: Category[];
  items?: MenuItem[];
  other_info?: string;
};

export interface MenuDetails {
  id: string;
  userId: string;
  menuId: string;
  restaurantId: string;
  menuName: string;
  imageUrl?: string;
  processedImageUrl?: string;
  menuData: MenuData;
  timestamp: string;
  restaurantName?: string;
  restaurantValidated?: boolean;
  validatorValidated?: boolean;
  yelpId?: string;
}

export interface MenuSummary {
  id: string;
  menuName: string | { original: string; english: string };
  imageUrl?: string;
  timestamp: Date;
  restaurantName?: string;
}

export interface MenuValidationStatus {
  restaurantValidated?: boolean;
  validatorValidated?: boolean;
}

// Search types
export interface SearchResult {
  id: string;
  restaurantName: string;
  location: string;
} 