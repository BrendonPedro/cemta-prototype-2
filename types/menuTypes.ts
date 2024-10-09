// types/menuTypes.ts

export interface MenuItem {
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
  category?: string;
}

export interface Menu {
  id: string;
  imageUrl: string;
  userId: string;
  menuName: string;
  restaurantName: string;
  location?: string;
  timestamp: string;
  menuData: {
    restaurant_info: {
      name: { original: string; english: string };
      address: { original: string; english: string };
      operating_hours: string;
      phone_number: string;
      website: string;
      social_media: string;
      description: { original: string; english: string };
      additional_notes: string;
    };
    categories: Array<{
      name: { original: string; english: string; pinyin: string };
      items: Array<{
        name: { original: string; english: string; pinyin: string };
        price: { amount: number; currency: string };
        description: { original: string; english: string };
        image_url: string;
        dietary_info: string[];
        sizes: { [key: string]: string };
        popular: boolean;
        chef_recommended: boolean;
        spice_level: string;
        allergy_alert: string;
        upgrades: Array<{ name: string; price: string }>;
        notes: string;
      }>;
    }>;
    other_info: string;
  };
}
