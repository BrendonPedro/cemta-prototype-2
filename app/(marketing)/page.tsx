"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader } from "lucide-react";
import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/config/firebaseConfig";
import { initializeApp, getApps, getApp } from "firebase/app";
import DynamicWelcomeMessage from "@/components/dynamicWelcomeMessage";

const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
const db = getFirestore(firebaseApp);

export default function Home() {
  const { firebaseUser } = useClerkFirebaseAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (firebaseUser) {
        const userRef = doc(db, "USERS", firebaseUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          setUsername(userData?.user_info?.user_name || null);
        }
      }
    };

    fetchUserData();
  }, [firebaseUser]);

  return (
    <div className="relative max-w-[1600px] mx-auto flex-1 w-full flex flex-col lg:flex-row items-center justify-center p-4 gap-2 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <Image
          src="/cemta_logo_idea1.svg"
          width={1600}
          height={1600}
          alt="cemta logo"
          className="animate-ping-slow"
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-y-8">
        <h1 className="font-bold text-center sm:text-5xl xl:text-9xl bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack hover:animate-pulse">
          CEMTA
        </h1>
        <p className="text-xl lg:text-3xl font-bold text-black max-w-[580px] text-center">
          <em>Revolutionizing the Dining Experience</em>
        </p>

        <div className="flex flex-col items-center gap-y-3 max-w-[330px] w-full">
          <ClerkLoading>
            <Loader className="h-5 w-5 text-muted-foreground animate-spin" />
          </ClerkLoading>
          <ClerkLoaded>
            <SignedOut>
              <SignUpButton>
                <Button size="lg" variant="cemta" className="w-full">
                  Get Started
                </Button>
              </SignUpButton>
              <SignInButton>
                <Button size="lg" variant="ghostTeal" className="w-full">
                  I already have an account
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button size="lg" variant="nextButton" className="w-full py-6" asChild>
                <Link href="/dashboards">Continue to Dashboard</Link>
              </Button>
              {username && <DynamicWelcomeMessage username={username} />}
            </SignedIn>
          </ClerkLoaded>
        </div>
      </div>
    </div>
  );
}

// --- ORIGINAL LAYOUT---

// import Image from "next/image";
// import { Loader } from "lucide-react";
// import {
//   ClerkLoaded,
//   ClerkLoading,
//   SignInButton,
//   SignUpButton,
//   SignedIn,
//   SignedOut,
// } from "@clerk/nextjs";
// import { Button } from "@/components/ui/button";
// import Link from "next/link";

// export default function Home() {
//   return (
//     <div className="max-w-[988px] mx-auto flex-1 w-full flex flex-col lg:flex-row items-center justify-center p-4 gap-2">
//       <div className="relative w-[240px] h-[240px] lg:w-[240px] lg:h-[240px] mb-8 lg:mb-0">
//         <Image
//           src="/cemta_logo_idea1.svg"
//           fill
//           alt="cemta logo"
//           className="animate-spin-slow"
//         />
//       </div>
//       <div className="flex flex-col items-center gap-y-8">
//         <h1 className="font-bold text-center sm:text-5xl xl:text-9xl bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack hover:animate-pulse">
//           CEMTA
//         </h1>
//         <p className="text-xl lg:text-2xl font-bold text-black max-w-[480px] text-center">
//           Manage your account and access support from the CEMTA Team
//         </p>
//         <div className="flex flex-col items-center gap-y-3 max-w-[330px] w-full">
//           <ClerkLoading>
//             <Loader className="h-5 w-5 text-muted-foreground animate-spin" />
//           </ClerkLoading>
//           <ClerkLoaded>
//             <SignedOut>
//               <SignUpButton
//                 mode="modal"
//                 afterSignInUrl="/dashboards"
//                 afterSignUpUrl="/dashboards"
//               >
//                 <Button size="lg" variant="cemta" className="w-full">
//                   Get Started
//                 </Button>
//               </SignUpButton>
//               <SignInButton
//                 mode="modal"
//                 afterSignInUrl="/dashboards"
//                 afterSignUpUrl="/dashboards"
//               >
//                 <Button size="lg" variant="ghostTeal" className="w-full">
//                   I already have an account
//                 </Button>
//               </SignInButton>
//             </SignedOut>
//             <SignedIn>
//               <Button size="lg" variant="cemta" className="w-full" asChild>
//                 <Link href="/dashboards">Continue to Dashboard</Link>
//               </Button>
//             </SignedIn>
//           </ClerkLoaded>
//         </div>
//       </div>
//     </div>
//   );
// }
