"use client";

import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@clerk/nextjs";

interface RoleChangeRequest {
  id: string;
  userId: string;
  requestedRole: "partner" | "validator";
  status: "pending" | "approved" | "rejected";
  submittedAt: any;
}

export default function RoleChangeRequestsAdmin() {
  const { userId } = useAuth();
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      const db = getFirestore();
      const requestsCollection = collection(db, "RoleChangeRequests");
      const q = query(requestsCollection, where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<RoleChangeRequest, "id">),
      }));
      setRequests(requestsData);
    };

    fetchRequests();
  }, []);

  const handleApprove = async (request: RoleChangeRequest) => {
    const db = getFirestore();
    const requestRef = doc(db, "RoleChangeRequests", request.id);
    const userRef = doc(db, "users", request.userId);

    // Update the user's role in Firestore
    await updateDoc(userRef, {
      "user_info.role": request.requestedRole,
      updated_at: serverTimestamp(),
    });

    // Update the request status
    await updateDoc(requestRef, {
      status: "approved",
      reviewedAt: serverTimestamp(),
      reviewedBy: userId,
    });

    // Remove the request from the list
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
  };

  const handleReject = async (request: RoleChangeRequest) => {
    const db = getFirestore();
    const requestRef = doc(db, "RoleChangeRequests", request.id);

    // Update the request status
    await updateDoc(requestRef, {
      status: "rejected",
      reviewedAt: serverTimestamp(),
      reviewedBy: userId,
    });

    // Remove the request from the list
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
  };

  return (
    <div>
      <h1>Role Change Requests</h1>
      {requests.map((request) => (
        <div key={request.id}>
          <p>User ID: {request.userId}</p>
          <p>Requested Role: {request.requestedRole}</p>
          <button onClick={() => handleApprove(request)}>Approve</button>
          <button onClick={() => handleReject(request)}>Reject</button>
        </div>
      ))}
    </div>
  );
}
