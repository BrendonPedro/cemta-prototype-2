// app/account/[[...index]]/page.tsx

"use client";

import { UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <div>
      <UserProfile />
    </div>
  );
}
