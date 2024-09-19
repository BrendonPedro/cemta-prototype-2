import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId, role } = await request.json();

  try {
    const user = await clerkClient.users.getUser(userId);

    await clerkClient.users.updateUser(userId, {
      publicMetadata: { ...user.publicMetadata, role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ success: false, error: "Failed to update user role" }, { status: 500 });
  }
}
