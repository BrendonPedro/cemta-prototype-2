'use client'

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ClerkLoading, ClerkLoaded, UserButton } from "@clerk/nextjs";
import { Loader, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarItem } from "./sidebar-item";
import { Button } from "@/components/ui/button";

type Props = {
  className?: string;
};

export const Sidebar = ({ className }: Props) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div
      className={cn(
        "flex h-full lg:w-[256px] lg:fixed left-0 top-0 px-4 border-r-2 flex-col ",
        className
      )}
    >
      <div className="flex items-center gap-x-0">
        <Image
          src="/cemta_logo_idea2.svg"
          height={100}
          width={100}
          alt="Mascot"
        />
        <Link href="/" legacyBehavior>
          <a>
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack hover:animate-pulse tracking-wide">
              CEMTA
            </h1>
          </a>
        </Link>
      </div>

      <div className="flex flex-col gap-y-2 flex-1">
        <div>
          <Button
            variant="ghostTeal"
            className="justify-start h-[52px] w-full flex items-center"
            onClick={toggleDropdown}
          >
            <Image
              src="/translate.png"
              alt="Dashboards"
              className="mr-5"
              height={32}
              width={32}
            />
            Dashboards
            <span className="ml-auto">
              {isDropdownOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </span>
          </Button>
          {isDropdownOpen && (
            <div className="pl-8 flex flex-col gap-y-2">
              <SidebarItem
                label="Validators"
                href="/dashboards/validators"
                iconSrc="/validate.png"
              />
              <SidebarItem
                label="Restaurants"
                href="/dashboards/restaurants"
                iconSrc="/restaurant.png"
              />
            </div>
          )}
        </div>
        <SidebarItem label="Menu Analyzer" href="/menuAnalyzer" iconSrc="/menu.png" />
        <SidebarItem
          label="Find Restaurants"
          href="/findRestaurants"
          iconSrc="/search.svg"
        />
        <SidebarItem label="Home" href="/" iconSrc="/menu.svg" />
      </div>
      <div className="p-4">
        <ClerkLoading>
          <Loader className="h-5 w-5 text-muted-foreground animate-spin" />
        </ClerkLoading>
        <ClerkLoaded>
          <UserButton afterSignOutUrl="/" />
        </ClerkLoaded>
      </div>
    </div>
  );
};


