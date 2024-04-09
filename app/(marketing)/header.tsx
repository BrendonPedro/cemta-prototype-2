import Image from "next/image";
import Link from "next/link";
import { Loader } from "lucide-react";
import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  SignedOut,
SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="h-20 w-full border-b-2 border-slate-300 px-4 bg-slate-100">
      <div className="lg:max-w-screen-lg mx-auto flex items-center justify-between h-full">
        <div className="pt-8 pl-4 pb-7 flex items-center gap-x-3">
          <Image src="/cemtaLogo.svg" height={40} width={40} alt="Mascot" />
          <Link href="/">
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack hover:animate-pulse tracking-wide">
              CEMTA
            </h1>
          </Link>
          <Button size="sm" variant="ghostTeal">
            <Link href="/">Home</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/findRestaurants">Restaurants</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/">Validators</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/">Cemta Team</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/">About</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/">Contact</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/">FAQ</Link>
          </Button>
        </div>
        <ClerkLoading>
          <Loader className="h-5 w-5 text-muted-foreground animate-spin" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton
              mode="modal"
              afterSignInUrl="/dashboards"
              afterSignUpUrl="/dashboards"
            >
              <Button size="lg" variant="default">
                Login
              </Button>
            </SignInButton>
          </SignedOut>
        </ClerkLoaded>
      </div>
    </header>
  );
};
