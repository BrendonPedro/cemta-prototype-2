// MainLayout.tsx
"use client";

import React from "react";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";

type Props = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: Props) => {
  return (
    <div>
      <Header />
      {children}
      <Footer />
    </div>
  );
};

export default MainLayout;
