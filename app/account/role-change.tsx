// app/account/role-change.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAuth } from "@/components/AuthProvider";
import { RequestableRoles } from "@/interfaces/auth/types";

export default function RoleChangePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { updateUserRole } = useAuth();
  const [requestedRole, setRequestedRole] = useState<RequestableRoles | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedRole) {
      setMessage("Please select a role");
      return;
    }

    try {
      setIsSubmitting(true);
      await updateUserRole(requestedRole);
      setMessage("Role change request submitted successfully");
      setRequestedRole(null);
    } catch (error) {
      setMessage("Failed to submit role change request");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Request Role Change</h1>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${message.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Select Role</label>
          <select
            className="w-full p-2 border rounded"
            value={requestedRole || ""}
            onChange={(e) => setRequestedRole(e.target.value as RequestableRoles || null)}
          >
            <option value="">Select a role</option>
            <option value="partner">Restaurant Partner</option>
            <option value="validator">Menu Validator</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-teal-500 text-white py-2 px-4 rounded hover:bg-teal-600 disabled:bg-gray-400"
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
