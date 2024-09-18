import React from "react";
import Image from "next/image";
import { Header } from "./header";
import { Footer } from "./footer";

type Props = {
  children: React.ReactNode;
};

const MarketingLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal to-white">
      <Header />
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <Image
            src="/cemta_logo_idea1.svg"
            alt="CEMTA logo"
            fill
            style={{ objectFit: "cover" }}
            quality={100}
          />
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-16">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketingLayout;
