// app/restaurants/[id]/page.tsx

import { Suspense } from "react";
import RestaurantPage from "@/components/RestaurantPage";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: {
    id: string;
  };
}

function LoadingFallback() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <Skeleton className="w-full aspect-video rounded-lg" />
        </div>
        <div className="lg:w-1/3 space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RestaurantPageWrapper({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RestaurantPage restaurantId={params.id} />
    </Suspense>
  );
}
