// components/ErrorBoundary.tsx
"use client";

import React from "react";
import { useEffect, useState } from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error("Error caught by boundary:", error);
      setHasError(true);
    };

    window.addEventListener("error", errorHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  if (hasError) {
    return (
      <div className="text-center p-4">
        <h2 className="text-xl font-bold text-red-500">Something went wrong</h2>
        <button
          onClick={() => {
            setHasError(false);
            window.location.reload();
          }}
          className="mt-4 px-4 py-2 bg-customTeal text-white rounded-lg hover:bg-customTeal/90"
        >
          Reload page
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
