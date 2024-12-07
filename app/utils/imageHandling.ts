// app/utils/imageHandling.ts

interface ImageHandlingProps {
    src: string;
    alt: string;
    className?: string;
    priority?: boolean;
    sizes?: string;
  }
  
  export const getImageProps = (
    imageUrl: string | undefined, 
    altText: string,
    type: 'card' | 'carousel' | 'detail' | 'menu'
  ): ImageHandlingProps => {
    const url = imageUrl || "/placeholder-restaurant.jpg";
    
    const sizesByType = {
      card: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
      carousel: "(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw",
      detail: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw",
      menu: "(max-width: 768px) 100vw, 50vw"
    };
  
    return {
      src: url,
      alt: altText,
      className: "object-cover transition-all duration-300",
      priority: type === 'carousel',
      sizes: sizesByType[type]
  };
};
