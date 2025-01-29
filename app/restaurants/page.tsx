'use client';

import RestaurantPageContent from "@/components/RestaurantPageContent";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function RestaurantsPage() {
  return (
    <ErrorBoundary>
      <RestaurantPageContent />
    </ErrorBoundary>
  );
}