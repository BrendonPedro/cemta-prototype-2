// app/utils/restaurantUtils.ts

import { Restaurant } from '@/interfaces/restaurant/types';

export const getRestaurantLink = (restaurant: Restaurant): string => {
  if (!restaurant.hasGoogleData && restaurant.hasYelpData) {
    return `/api/restaurants/save?id=${restaurant.id}&source=yelp`;
  }
  return `/restaurants/${restaurant.id}`;
};

export const getImageUrl = (
  restaurant: Restaurant, 
  type: 'card' | 'carousel' | 'detail'
): {
  src: string;
  alt: string;
  sizes: string;
} => {
  const imageUrl = restaurant.imageUrl || restaurant.photoUrl || '/placeholder-restaurant.jpg';
  
  const sizesByType = {
    card: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    carousel: "(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw",
    detail: "(max-width: 768px) 100vw, 50vw"
  };

  return {
    src: imageUrl,
    alt: restaurant.name,
    sizes: sizesByType[type]
  };
};