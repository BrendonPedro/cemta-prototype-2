// app/menu-details/[id]/page.tsx

import MenuDetailsPage from "@/components/MenuDetailsPage";
import MarketingLayout from "@/app/shared/layouts/MarketingLayout";

export default function MenuDetailPage({ params }: { params: { id: string } }) {
  return <MenuDetailsPage />;
}
