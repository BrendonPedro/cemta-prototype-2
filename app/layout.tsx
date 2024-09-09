// app/layout.tsx

import type { Metadata } from "next";
import { Anuphan } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const font = Anuphan({ subsets: ["latin"], weight: "700" });

export const metadata: Metadata = {
  title: "CEMTA",
  description: "Revolutionizing the Dining Experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${font.className} font-fallback`}>
          <AuthProvider>{children}</AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
