// components/RequestRoleChange.tsx

"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/config/firebaseConfig";
import { initializeApp, getApps, getApp } from "firebase/app";

interface RoleRequest {
  requestedRole: "partner" | "validator";
  status: "pending";
}

const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
const db = getFirestore(firebaseApp);

const RequestRoleChange = () => {
  const { user } = useUser();
  const [requestedRole, setRequestedRole] = useState<"partner" | "validator">(
    "partner",
  );
  const [message, setMessage] = useState("");

  const handleRequest = async () => {
    if (user) {
      // Update Clerk's publicMetadata
      await (user as any).update({
        publicMetadata: {
          ...(user.publicMetadata || {}),
          roleRequest: {
            requestedRole,
            status: "pending",
          },
        },
      });

      // Update Firestore
      const userRef = doc(db, "users", user.id);
      await setDoc(
        userRef,
        {
          user_info: {
            roleRequest: {
              requestedRole,
              status: "pending",
            },
          },
        },
        { merge: true },
      );

      setMessage("Your role change request has been submitted.");
    }
  };

  return (
    <div>
      <h2>Request Role Change</h2>
      <select
        value={requestedRole}
        onChange={(e) =>
          setRequestedRole(e.target.value as "partner" | "validator")
        }
      >
        <option value="partner">Restaurant Partner</option>
        <option value="validator">Community Validator</option>
      </select>
      <button onClick={handleRequest}>Submit Request</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default RequestRoleChange;
