"use client";

import React from "react";
import useAuth from "@/hooks/useClerkFirebaseAuth";

const PendingApprovalMessage: React.FC = () => {
  const { roleRequest } = useAuth();

  if (!roleRequest || roleRequest.status !== "pending") {
    return null;
  }

  return (
    <div
      className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-4"
      role="alert"
    >
      <p className="font-bold">Role Change Request Pending</p>
      <p>
        Your request to change your role to {roleRequest.requestedRole} is
        currently pending approval. You will be notified once an admin has
        reviewed your request.
      </p>
    </div>
  );
};

export default PendingApprovalMessage;
