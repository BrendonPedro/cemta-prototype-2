'use client';

import React from "react";
import DocumentAiResultsDisplay from "@/components/DocumentAiResultsDisplay";
import { useAuth } from "@clerk/nextjs";

const DashboardPage = () => {
  const { userId } = useAuth();

  if (!userId) {
    return <div>Loading...</div>; // Or some loading spinner
  }

  return (
    <div>
      <DocumentAiResultsDisplay userId={userId} />
    </div>
  );
};

export default DashboardPage;
