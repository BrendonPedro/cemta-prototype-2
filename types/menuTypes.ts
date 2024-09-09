// types/menuTypes.ts

export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export interface Menu {
  items: MenuItem[];
  restaurantName?: string;
  date?: string;
}