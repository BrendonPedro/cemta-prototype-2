// app/(main)/dashboards/page.tsx
"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import DocumentAiResultsDisplay from "@/components/DocumentAiResultsDisplay";
import VertexAiResultsDisplay from "@/components/vertexAiResultsDisplay";
import { Button } from "@/components/ui/button";
import OldMenuUpload from "@/components/OldMenuUpload";

const DashboardPage = () => {
  const { userId } = useAuth();
  const [view, setView] = useState<"upload" | "documentAI" | "vertexAI">(
    "upload"
  );

  if (!userId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="mb-4 space-x-2">
        <Button onClick={() => setView("upload")}>Upload Menu</Button>
        <Button onClick={() => setView("documentAI")}>
          Document AI Results
        </Button>
        <Button onClick={() => setView("vertexAI")}>Vertex AI Results</Button>
      </div>

      {view === "upload" && <OldMenuUpload />}
      {view === "documentAI" && <DocumentAiResultsDisplay userId={userId} />}
      {view === "vertexAI" && <VertexAiResultsDisplay userId={userId} />}
    </div>
  );
};

export default DashboardPage;
