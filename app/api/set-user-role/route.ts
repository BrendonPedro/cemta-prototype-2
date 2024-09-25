import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

// Role request endpoint
export async function POST(request: Request) {
  const { userId, requestedRole } = await request.json();

  try {
    const user = await clerkClient.users.getUser(userId);

    // Update Firestore
    const db = getFirestore();
    const userRef = doc(db, "users", userId);

    await updateDoc(userRef, {
      'user_info.roleRequest': {
        requestedRole,
        status: 'pending'
      }
    });

    // Update Clerk public metadata
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { 
        ...user.publicMetadata, 
        roleRequest: {
          requestedRole,
          status: 'pending'
        }
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error requesting role change:", error);
    return NextResponse.json({ success: false, error: "Failed to request role change" }, { status: 500 });
  }
}

// Admin role approval endpoint
export async function PUT(request: Request) {
  const { userId, approved } = await request.json();
  const { userId: adminId } = auth();

  // Check if the requester is an admin
  if (!adminId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const adminUser = await clerkClient.users.getUser(adminId);
  if (adminUser.publicMetadata.role !== 'admin') {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getFirestore();
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    if (!userData || !userData.user_info.roleRequest) {
      return NextResponse.json({ success: false, error: "No pending role request" }, { status: 400 });
    }

    const newRole = approved ? userData.user_info.roleRequest.requestedRole : userData.user_info.role;
    const newStatus = approved ? 'approved' : 'rejected';

    // Update Firestore
    await updateDoc(userRef, {
      'user_info.role': newRole,
      'user_info.roleRequest': {
        requestedRole: null,
        status: newStatus
      }
    });

    // Update Clerk
    const user = await clerkClient.users.getUser(userId);
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { 
        ...user.publicMetadata, 
        role: newRole,
        roleRequest: {
          requestedRole: null,
          status: newStatus
        }
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
  }
}