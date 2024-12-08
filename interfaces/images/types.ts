// types/images.ts
export type ImageType = 'card' | 'carousel' | 'detail' | 'menu';

export interface ImageHandlingProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

