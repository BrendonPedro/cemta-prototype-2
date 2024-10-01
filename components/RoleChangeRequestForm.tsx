// components/RoleChangeRequestForm.tsx

"use client";

import { useState } from "react";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useUser } from "@clerk/nextjs";
import { getApps, initializeApp } from "firebase/app";
import { firebaseConfig } from "@/config/firebaseConfig";

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

export default function RoleChangeRequestForm() {
  const { user } = useUser();
  const [requestedRole, setRequestedRole] = useState<"partner" | "validator">(
    "partner"
  );
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const db = getFirestore();
    const requestsCollection = collection(db, "RoleChangeRequests");
    await addDoc(requestsCollection, {
      userId: user.id,
      requestedRole,
      status: "pending",
      submittedAt: serverTimestamp(),
    });

    // Optionally, update the user's publicMetadata in Clerk
    await (user as any).update({
      publicMetadata: {
        ...(user.publicMetadata || {}),
        roleRequest: {
          requestedRole,
          status: "pending",
        },
      },
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
