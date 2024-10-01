// app/account/role-change/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import RoleChangeRequestForm from "@/components/RoleChangeRequestForm";

export default function RoleChangePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Request Role Change</h1>
      <RoleChangeRequestForm />
    </div>
  );
}
