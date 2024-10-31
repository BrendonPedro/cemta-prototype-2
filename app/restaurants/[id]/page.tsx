// app/restaurants/[id]/page.tsx

import { Suspense } from "react";
import RestaurantPage from "@/components/RestaurantPage";
import { Skeleton } from "@/components/ui/skeleton";
import { notFound } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}

// Enhanced loading skeleton
function LoadingFallback() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          {/* Carousel skeleton */}
          <div className="relative">
            <Skeleton className="w-full aspect-video rounded-lg" />
            <div className="absolute top-1/2 -translate-y-1/2 left-4">
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-4">
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
          </div>

          {/* Photo grid skeleton */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        <div className="lg:w-1/3 space-y-6">
          {/* Restaurant info skeleton */}
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
            {/* Business hours skeleton */}
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Menu section skeleton */}
      <div className="mt-12">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Error boundary component
function ErrorDisplay({ error }: { error: Error }) {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-semibold text-red-800 mb-2">
          Error Loading Restaurant
        </h2>
        <p className="text-red-600">{error.message}</p>
      </div>
    </div>
  );
}

export default function RestaurantPageWrapper({ params }: PageProps) {
  if (!params.id) {
    return notFound();
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <RestaurantPage restaurantId={params.id} />
    </Suspense>
  );
}


// Add metadata generation
export async function generateMetadata({ params }: PageProps) {
  try {
    // You can fetch basic restaurant info here for metadata
    // Using your existing services
    return {
      title: `Restaurant Details`,
      description: `View menu, photos, and details`,
    };
  } catch (error) {
    return {
      title: "Restaurant Not Found",
      description: "The requested restaurant could not be found.",
    };
  }
}
