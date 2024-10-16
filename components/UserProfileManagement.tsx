import React from "react";
import { UserProfile } from "@clerk/nextjs";
import { useAuth } from "@/components/AuthProvider";

const UserProfileManagement: React.FC = () => {
  const { userData, updateUserRole } = useAuth();

  const handleRoleChange = (
    newRole: "user" | "admin" | "partner" | "validator",
  ) => {
    updateUserRole(newRole);
  };

  return (
    <div>
      <h1>User Profile Management</h1>
      <UserProfile />
      <div>
        <h2>Change Role</h2>
        <select
          value={userData?.role || "user"}
          onChange={(e) =>
            handleRoleChange(
              e.target.value as "user" | "admin" | "partner" | "validator",
            )
          }
        >
          <option value="user">User</option>
          <option value="partner">Partner</option>
          <option value="validator">Validator</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </div>
  );
};

export default UserProfileManagement;
