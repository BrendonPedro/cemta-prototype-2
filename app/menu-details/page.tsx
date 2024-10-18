// app/menu-details/page.tsx

"use client";

import React from "react";
import MenuSearch from "@/components/MenuSearch";
import { useRouter } from "next/navigation";

export default function MenuDetailsPage() {
  const router = useRouter();

  const handleMenuSelect = (menuId: string) => {
    router.push(`/menu-details/${menuId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Menu Details</h1>
      <p className="mb-4">Please select a menu to view its details:</p>
      <MenuSearch onMenuSelect={handleMenuSelect} />
    </div>
  );
}

