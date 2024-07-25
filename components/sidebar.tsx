import Link from "next/link";
import Image from "next/image";
import { ClerkLoading, ClerkLoaded, UserButton } from "@clerk/nextjs";
import { Loader } from "lucide-react";

import { cn } from "@/lib/utils";

import { SidebarItem } from "./sidebar-item";

type Props = {
  className?: string;
};

export const Sidebar = ({ className }: Props) => {
  return (
    <div
      className={cn(
        "flex h-full lg:w-[256px] lg:fixed left-0 top-0 px-4 border-r-2 flex-col ",
        className,
      )}
    >
      <div className="flex items-center gap-x-0">
        <Image src="/cemta_logo_idea2.svg" height={100} width={100} alt="Mascot" />
        <Link href="/">
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack hover:animate-pulse tracking-wide">
            CEMTA
          </h1>
        </Link>
      </div>

      <div className="flex flex-col gap-y-2 flex-1">
        <SidebarItem label="Menus" href="/menus" iconSrc="/menu.png" />
        <SidebarItem
          label="OCR"
          href="/ocr"
          iconSrc="/menu.svg"
        />
        <SidebarItem label="TRANSLATE" href="/translate" iconSrc="/translate.png" />
        <SidebarItem label="Validate" href="/validate" iconSrc="/validate.png" />
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
