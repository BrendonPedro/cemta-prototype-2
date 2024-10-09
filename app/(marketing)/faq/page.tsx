'use client';

import React from "react";
import ProfileUpdateHandler from "@/components/ProfileUpdateHandler";
import { AuthProvider } from "@/components/AuthProvider";

const faqPage = () => {
  return (
    <AuthProvider>
      <div>
        <ProfileUpdateHandler />
      </div>
    </AuthProvider>
  );
};

export default faqPage;
