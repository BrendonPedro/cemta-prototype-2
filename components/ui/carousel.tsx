// components/ui/carousel.tsx

"use client";

import * as React from "react";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

type CarouselApi = UseEmblaCarouselType[1];
type CarouselProps = {
  opts?: Parameters<typeof useEmblaCarousel>[0];
  plugins?: Parameters<typeof useEmblaCarousel>[1];
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: CarouselApi | null;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
        align: "center",
        containScroll: "trimSnaps",
      },
      plugins
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback(() => {
      if (!api) return;
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    }, [api]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          api?.scrollPrev();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          api?.scrollNext();
        }
      },
      [api]
    );

    React.useEffect(() => {
      if (!api || !setApi) {
        return;
      }
      setApi(api);
    }, [api, setApi]);

    React.useEffect(() => {
      if (!api) return;
      api.on("select", onSelect);
      onSelect();
      return () => {
        api.off("select", onSelect);
      };
    }, [api, onSelect]);

    // Scaling effect using public API methods
    React.useEffect(() => {
      if (!api) return;

      const slides = api.slideNodes();

      const scaleSlides = () => {
        const scrollProgress = api.scrollProgress();

        slides.forEach((slide, index) => {
          const slidePosition = api.scrollSnapList()[index];
          const distance = Math.abs(scrollProgress - slidePosition);
          const scale = Math.max(0.85, 1 - distance * 0.3);
          slide.style.transform = `scale(${scale})`;
          slide.style.zIndex = `${1000 - Math.round(distance * 1000)}`;
        });
      };

      api.on("scroll", scaleSlides);
      scaleSlides();

      return () => {
        api.off("scroll", scaleSlides);
      };
    }, [api]);

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api,
          opts,
          orientation,
          scrollPrev: () => api?.scrollPrev(),
          scrollNext: () => api?.scrollNext(),
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef } = useCarousel();

  return (
    <div ref={carouselRef} className="overflow-hidden">
      <div
        ref={ref}
        className={cn("flex -mx-2", className)} // Adjust negative margin
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "relative flex-shrink-0 px-2",
        // Responsive widths
        "flex-[0_0_80%] sm:flex-[0_0_60%] md:flex-[0_0_40%] lg:flex-[0_0_33.333%]",
        className
      )}
      {...props}
    />
  );
});
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useCarousel();

  return (
    <button
      ref={ref}
      className={cn(
        "absolute z-10 h-12 w-12 rounded-full bg-white bg-opacity-70 hover:bg-opacity-90 shadow-md",
        "flex items-center justify-center",
        "-left-4 sm:-left-6 top-1/2 -translate-y-1/2",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-6 w-6 text-customTeal" />
      <span className="sr-only">Previous slide</span>
    </button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { scrollNext, canScrollNext } = useCarousel();

  return (
    <button
      ref={ref}
      className={cn(
        "absolute z-10 h-12 w-12 rounded-full bg-white bg-opacity-70 hover:bg-opacity-90 shadow-md",
        "flex items-center justify-center",
        "-right-4 sm:-right-6 top-1/2 -translate-y-1/2",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-6 w-6 text-customTeal" />
      <span className="sr-only">Next slide</span>
    </button>
  );
});
CarouselNext.displayName = "CarouselNext";

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
};
