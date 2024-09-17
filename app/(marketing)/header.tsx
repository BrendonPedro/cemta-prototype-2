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
        <div className="pt-8 pl-4 pb-7 flex items-center gap-x-1">
          <Image
            src="/cemta_logo_idea2.svg"
            height={100}
            width={100}
            alt="Mascot"
          />
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
            <Link href="/dashboards">Dashboard</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/cemtaTeam">Cemta Team</Link>
          </Button>
          <Button size="sm" variant="ghostTeal">
            <Link href="/about">About</Link>
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
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton>
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
