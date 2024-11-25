import React from "react";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";

export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal/5 to-white">
      <Header />
      <main className="flex-1 relative">
        <div className="fixed inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-br from-customTeal/10 to-transparent" />
        </div>
        <div className="relative z-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
} 