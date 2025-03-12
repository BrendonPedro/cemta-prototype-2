export interface YelpCategory {
  alias: string;
  title: string;
}

export interface YelpBusiness {
  id: string;
  name: string;
  image_url?: string;
  url?: string;
  review_count?: number;
  rating?: number;
  price?: string;
  phone?: string;
  display_phone?: string;
  distance?: number;
  categories?: YelpCategory[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  location?: {
    address1?: string;
    address2?: string;
    address3?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    display_address?: string[];
  };
  photos?: string[];
}

export interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
  region: {
    center: {
      latitude: number;
      longitude: number;
    };
  };
} 