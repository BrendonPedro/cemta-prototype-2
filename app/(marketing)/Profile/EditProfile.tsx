"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RequestableRoles } from "@/interfaces/auth/types";

const EditProfilePage: React.FC = () => {
  const { userRole, updateUserRole } = useAuth();
  const [requestedRole, setRequestedRole] = useState<RequestableRoles | null>(null);

  const handleRoleRequest = async () => {
    if (requestedRole) {
      await updateUserRole(requestedRole);
      alert("Role change request submitted");
    }
  };

  return (
    <div>
      <h1>Edit Profile</h1>
      {/* Add other profile editing fields here */}

      <h2>Request Role Change</h2>
      <select
        value={requestedRole || ""}
        onChange={(e) =>
          setRequestedRole(e.target.value as RequestableRoles || null)
        }
      >
        <option value="">Select a role</option>
        <option value="partner">Partner</option>
        <option value="validator">Validator</option>
      </select>
      <button onClick={handleRoleRequest}>Submit Role Request</button>
    </div>
  );
};

export default EditProfilePage;
