// app/restaurants/[id]/page.tsx

import RestaurantPage from "@/components/RestaurantPage";

interface PageProps {
  params: {
    id: string;
  };
}

export default function RestaurantPageWrapper({ params }: PageProps) {
  const { id } = params;

  return <RestaurantPage restaurantId={id} />;
}
