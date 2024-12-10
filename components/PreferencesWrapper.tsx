// components/PreferencesWrapper.tsx

"use client";

import { useAuth } from "@/components/AuthProvider";
import PreferencesForm from "@/components/UserPreferences";
import { useRouter } from 'next/navigation';

export default function PreferencesWrapper() {
  const { loading, userId } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!userId) {
    router.push('/login');
    return null;
  }

  return <PreferencesForm />;
}