// types/menuTypes.ts

export interface MenuItem {
  name: {
    original: string;
    english: string;
    pinyin: string;
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

export interface Category {
  name: {
    original: string;
    english: string;
    pinyin: string;
  };
  items: MenuItem[];
}

export interface MenuData {
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
  categories: Category[];
  other_info: string;
}
