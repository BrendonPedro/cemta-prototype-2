"use client";

import { useState } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@clerk/nextjs";

export default function RoleChangeRequestForm() {
  const { userId } = useAuth();
  const [requestedRole, setRequestedRole] = useState<"partner" | "validator">(
    "partner"
  );
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const db = getFirestore();
    const requestsCollection = collection(db, "RoleChangeRequests");
    await addDoc(requestsCollection, {
      userId,
      requestedRole,
      status: "pending",
      submittedAt: serverTimestamp(),
    });

    setMessage("Your role change request has been submitted.");
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Request Role Change:
        <select
          value={requestedRole}
          onChange={(e) =>
            setRequestedRole(e.target.value as "partner" | "validator")
          }
        >
          <option value="partner">Partner</option>
          <option value="validator">Validator</option>
        </select>
      </label>
      <button type="submit">Submit Request</button>
      {message && <p>{message}</p>}
    </form>
  );
}
