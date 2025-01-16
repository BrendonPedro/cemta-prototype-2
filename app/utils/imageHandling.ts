
// app/utils/imageHandling.ts
import { ImageType, ImageHandlingProps } from "@/interfaces/images/types";
import { Restaurant } from "@/app/services/restaurant/types";

const SIZES_BY_TYPE = {
  card: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw)",
  carousel: "(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw)",
  detail: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw)",
  menu: "(max-width: 768px) 100vw, 50vw)"
} as const;

export const getImageProps = (
  imageUrl: string | undefined, 
  altText: string,
  type: ImageType
): ImageHandlingProps => {
  const url = imageUrl || "/placeholder-restaurant.jpg";
  
  return {
    src: url,
    alt: altText,
    className: "object-cover transition-all duration-300",
    priority: type === 'carousel',
    sizes: SIZES_BY_TYPE[type]
  };
};

// Helper for restaurant images specifically
export const getRestaurantImageProps = (
  restaurant: Restaurant,
  type: ImageType
): ImageHandlingProps & { unoptimized: boolean } => {
  const imageUrl = restaurant.imageUrl || restaurant.photoUrl;
  const props = getImageProps(imageUrl, restaurant.name, type);
  
  return {
    ...props,
    unoptimized: Boolean(imageUrl?.includes('yelp'))
  };
};

// Error handling helper
export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  console.error("Image load error:", e);
  e.currentTarget.src = '/placeholder-restaurant.jpg';
};