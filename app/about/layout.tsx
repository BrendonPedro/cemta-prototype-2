// app/about/layout.tsx

import React from "react";
import Image from "next/image";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";

type Props = {
  children: React.ReactNode;
};

const AboutpageLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal to-white">
      <Header />
      <main className="flex-1 relative">
        <div className="fixed inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <Image
            src="/cemta_logo_idea1.svg"
            alt="CEMTA logo"
            fill
            style={{ objectFit: "cover" }}
            quality={100}
          />
        </div>
        <div className="relative z-10">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutpageLayout;
