

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const EditProfilePage: React.FC = () => {
  const { userData, updateUserRole } = useAuth();
  const [requestedRole, setRequestedRole] = useState<
    "partner" | "validator" | null
  >(null);

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
          setRequestedRole(e.target.value as "partner" | "validator" | null)
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
