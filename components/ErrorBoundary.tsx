/**
 * @file ErrorBoundary.tsx
 * @description Client-side error boundary component that catches and handles runtime errors
 */

"use client";

import React, { useEffect, useState } from "react";

/**
 * Props interface for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * ErrorBoundary Component
 * Provides a fallback UI when an error occurs in its child component tree
 * 
 * @component
 * @param {React.ReactNode} children - The child components to be wrapped
 */
export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  // State to track error occurrence
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    /**
     * Error event handler function
     * Logs the error and updates the error state
     * 
     * @param {ErrorEvent} error - The error event object
     */
    const errorHandler = (error: ErrorEvent) => {
      console.error("Error caught by boundary:", error);
      setHasError(true);
    };

    // Add error event listener when component mounts
    window.addEventListener("error", errorHandler);

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  // Render error UI if an error occurred
  if (hasError) {
    return (
      <div className="text-center p-4">
        <h2 className="text-xl font-bold text-red-500">
          Something went wrong
        </h2>
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

  // Render children if no error occurred
  return <>{children}</>;
}

/**
 * Component Documentation
 * 
 * Purpose:
 * The ErrorBoundary component provides a safety net for handling runtime errors
 * in React applications, preventing the entire app from crashing.
 * 
 * Features:
 * - Catches runtime JavaScript errors
 * - Provides fallback UI for error states
 * - Includes reload functionality for recovery
 * - Cleans up event listeners on unmount
 * 
 * Styling Dependencies:
 * 1. tailwind.config.ts:
 *    - Uses custom color 'customTeal'
 *    - Utilizes Tailwind's utility classes for:
 *      - Spacing (p-4, mt-4, px-4, py-2)
 *      - Typography (text-xl, font-bold)
 *      - Colors (text-red-500, text-white)
 *      - Layout (text-center)
 *      - Borders (rounded-lg)
 *      - Hover states (hover:bg-customTeal/90)
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 * 
 * Best Practices:
 * 1. Place at top-level for broad error catching
 * 2. Can be nested for more granular error handling
 * 3. Use multiple instances for isolating error-prone sections
 * 
 * Example Implementation:
 * ```tsx
 * // pages/_app.tsx or similar
 * export default function App() {
 *   return (
 *     <ErrorBoundary>
 *       <RestOfYourApp />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 * 
 * Notes:
 * - This is a client-side only component ("use client")
 * - Handles only runtime errors, not build-time errors
 * - Complements, not replaces, server-side error handling
 * 
 * Related Components:
 * - Can be used with loading states
 * - Works alongside suspense boundaries
 * - Integrates with error logging services
 */