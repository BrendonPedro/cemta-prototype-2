'use client';

import React, { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@clerk/nextjs";

const AdminRoleManagement: React.FC = () => {
  const [roleRequests, setRoleRequests] = useState<any[]>([]);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchRoleRequests();
  }, []);

  const fetchRoleRequests = async () => {
    const db = getFirestore();
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("user_info.roleRequest.status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    const requests = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRoleRequests(requests);
  };

  const handleRoleRequest = async (userId: string, approved: boolean) => {
    const token = await getToken({ template: "integration_firebase" });
    const response = await fetch("/api/role", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, approved }),
    });

    if (response.ok) {
      fetchRoleRequests(); // Refresh the list after update
    } else {
      console.error("Failed to update role request");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Role Management</h1>
      {roleRequests.length === 0 ? (
        <p>No pending role requests.</p>
      ) : (
        roleRequests.map((request: any) => (
          <div
            key={request.id}
            className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4"
          >
            <p className="mb-2">
              <span className="font-bold">{request.user_info.user_name}</span>{" "}
              requested {request.user_info.roleRequest.requestedRole} role
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleRoleRequest(request.id, true)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Approve
              </button>
              <button
                onClick={() => handleRoleRequest(request.id, false)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminRoleManagement;
