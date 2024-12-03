"use client";

import { useAuth } from "@/components/AuthProvider";
import PreferencesForm from "@/components/UserPreferences";

export default function PreferencesWrapper() {
  const {loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <PreferencesForm/>;
}