// app/(marketing)/header.tsx

"use client";

import React, { useState, forwardRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader, LogIn, Menu, X } from "lucide-react";
import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";

interface HeaderProps {
  className?: string;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ className = "" }, ref) => {
    const { userRole } = useClerkFirebaseAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const isActive = (href: string) => pathname === href;

    const getDashboardUrl = (role: string | null) => {
      switch (role) {
        case "admin":
          return "/dashboards/admin";
        case "partner":
          return "/dashboards/partner";
        case "validator":
          return "/dashboards/validator";
        default:
          return "/dashboards/user";
      }
    };

    const navItems = [
      { href: "/", label: "Home" },
      { href: "/menuAnalyzer", label: "TranslateMenuPro" },
      { href: "/find-restaurants", label: "Restaurants" },
      { href: getDashboardUrl(userRole), label: "Dashboard" },
      { href: "/cemtaTeam", label: "CEMTA Team" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ];

    return (
      <header
        ref={ref}
        className={`bg-white bg-opacity-90 backdrop-blur-md shadow-lg ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <Image
                  src="/cemta_logo_idea2.svg"
                  height={40}
                  width={40}
                  alt="CEMTA logo"
                  className="mr-2"
                />
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-customTeal to-customBlack">
                  CEMTA
                </h1>
              </Link>
            </div>
            <div className="hidden md:flex space-x-2">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                    isActive(href)
                      ? "bg-teal-500 text-white shadow-md"
                      : "text-gray-600 hover:bg-teal-100 hover:text-teal-600"
                  }`}
                >
                  <span className="font-medium">{label}</span>
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              <ClerkLoading>
                <Loader className="h-5 w-5 text-customTeal animate-spin" />
              </ClerkLoading>
              <ClerkLoaded>
                <SignedIn>
                  <div className="flex items-center gap-x-2">
                    {userRole && (
                      <span className="text-sm text-customTeal capitalize">
                        {userRole}
                      </span>
                    )}
                    <UserButton />
                  </div>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button
                      variant="nextButton"
                      size="sm"
                      className="hidden md:flex items-center space-x-2 rounded-full hover:bg-customTeal hover:text-white transition-colors duration-300"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Login</span>
                    </Button>
                  </SignInButton>
                </SignedOut>
              </ClerkLoaded>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </nav>
        </div>
        {isMenuOpen && (
          <div className="md:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex flex-col space-y-2 py-4">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                    isActive(href)
                      ? "bg-teal-500 text-white shadow-md"
                      : "text-gray-600 hover:bg-teal-100 hover:text-teal-600"
                  }`}
                >
                  <span className="font-medium">{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
    );
  }
);

Header.displayName = "Header";
