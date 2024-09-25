"use client";

import React, { useState } from "react";
import { useAuth } from "@clerk/nextjs";

const RoleRequestButton: React.FC = () => {
  const [requestedRole, setRequestedRole] = useState<string>("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { userId, getToken } = useAuth();

  const handleRoleRequest = async () => {
    if (!requestedRole) return;

    setIsRequesting(true);
    setMessage(null);

    try {
      const token = await getToken({ template: "integration_firebase" });
      const response = await fetch("/api/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, requestedRole }),
      });

      if (response.ok) {
        setMessage(
          "Role change requested successfully. Please wait for admin approval."
        );
        setRequestedRole("");
      } else {
        setMessage("Failed to request role change. Please try again.");
      }
    } catch (error) {
      console.error("Error requesting role change:", error);
      setMessage("An error occurred. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="mt-4">
      <select
        value={requestedRole}
        onChange={(e) => setRequestedRole(e.target.value)}
        className="block w-full px-4 py-2 mb-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none focus:ring"
      >
        <option value="">Select a role</option>
        <option value="partner">Partner</option>
        <option value="validator">Validator</option>
      </select>
      <button
        onClick={handleRoleRequest}
        disabled={isRequesting || !requestedRole}
        className="px-4 py-2 font-bold text-white bg-blue-500 rounded-md hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:opacity-50"
      >
        {isRequesting ? "Requesting..." : "Request Role Change"}
      </button>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default RoleRequestButton;
