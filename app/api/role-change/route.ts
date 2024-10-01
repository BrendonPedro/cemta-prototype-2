// app/api/role-change/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/config/firebaseConfig';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface PublicMetadata {
  role?: string;
  roleRequest?: {
    requestedRole?: string;
    status?: string;
  } | null;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the admin user's role
  const adminUser = await clerkClient.users.getUser(userId);
  const adminMetadata = adminUser.publicMetadata as PublicMetadata;
  const adminRole = adminMetadata.role;

  if (adminRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { targetUserId, approve } = await request.json();

  // Fetch the target user
  const targetUser = await clerkClient.users.getUser(targetUserId);
  const publicMetadata = targetUser.publicMetadata as PublicMetadata;
  const requestedRole = publicMetadata.roleRequest?.requestedRole;

  if (!requestedRole) {
    return NextResponse.json({ error: 'No role request found for this user.' }, { status: 400 });
  }

  if (approve) {
    // Update Clerk
    await clerkClient.users.updateUser(targetUserId, {
      publicMetadata: {
        ...(publicMetadata || {}),
        role: requestedRole,
        roleRequest: null,
      },
    });

    // Update Firestore
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, {
      'user_info.role': requestedRole,
      'user_info.roleRequest': {
        requestedRole: null,
        status: 'approved',
      },
    });
  } else {
    // Reject the request
    await clerkClient.users.updateUser(targetUserId, {
      publicMetadata: {
        ...(publicMetadata || {}),
        roleRequest: {
          requestedRole: null,
          status: 'rejected',
        },
      },
    });

    // Update Firestore
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, {
      'user_info.roleRequest': {
        requestedRole: null,
        status: 'rejected',
      },
    });
  }

  return NextResponse.json({ message: 'Role request processed.' });
}
