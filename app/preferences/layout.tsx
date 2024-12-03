import React from "react";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";

export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal/5 to-white">
      <Header />
      <main className="flex-1 relative py-16">
        <div className="fixed inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-br from-customTeal/10 to-transparent" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Dietary Preferences
            </h1>
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 