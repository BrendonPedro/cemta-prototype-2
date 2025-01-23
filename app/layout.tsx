/**
 * @file app/layout.tsx
 * @description Root layout component that wraps the entire application
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";
import { Toaster } from "@/components/ui/toast"
import { MapsProvider } from "@/app/contexts/MapsContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CEMTA",
  description: "Revolutionizing the Dining Experience",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <AuthProvider>
            <MapsProvider>
              {children}
            </MapsProvider>
          </AuthProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
