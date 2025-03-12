"use client";

import React from "react";
import { AuthProvider } from "@/components/AuthProvider";

const faqPage = () => {
  return (
    <AuthProvider>
      <div>
        <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
        <div className="space-y-6">
          <p>FAQ content will go here.</p>
        </div>
      </div>
    </AuthProvider>
  );
};

export default faqPage;
