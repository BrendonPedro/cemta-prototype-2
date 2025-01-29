"use client";

import React, { useState, forwardRef, useEffect } from "react";
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
    const [isClient, setIsClient] = useState(false);

    // We only render user-specific Clerk stuff after client hydration
    useEffect(() => {
      setIsClient(true);
    }, []);

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
      { href: "/menuAnalyzer", label: "MenuAI" },
      { href: "/restaurants", label: "Restaurants" },
      { href: getDashboardUrl(userRole), label: "Dashboard" },
      // { href: "/cemtaTeam", label: "CEMTA Team" },
      { href: "/about", label: "About Us" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ];

    return (
      <header
        ref={ref}
        // Make header "fixed" so it stays visible on scroll
        className={`fixed top-0 left-0 w-full z-50 bg-white bg-opacity-90 backdrop-blur-md shadow-lg ${className}`}
      >
        <nav className="flex justify-between items-center py-3 px-4 md:px-6">
          {/* Left: Logo + Brand Name */}
          <Link href="/" className="flex items-center space-x-2 ml-4">
            {/* 1) Fixed 40px container (Tailwind h-10 = 2.5rem) */}
            <div className="relative h-10 w-10 overflow-visible">
              <Image
                src="/cemta_logo_idea2.svg"
                alt="CEMTA logo"
                fill
                /* 2) Enlarge the SVG, set transform origin to keep it centered */
                className="object-contain transform scale-[3] origin-center ml-2"
              />
            </div>

            {/* 3) Keep brand text as normal (or reduce if you need more space) */}
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack">
              CEMTA
            </h1>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex space-x-2">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 ${
                  isActive(href)
                    ? "bg-teal-500 text-white shadow-md"
                    : "text-gray-600 hover:bg-teal-100 hover:text-teal-600"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right: Login/User */}
          <div className="flex items-center space-x-4">
            <ClerkLoading>
              <Loader className="h-5 w-5 text-customTeal animate-spin" />
            </ClerkLoading>
            <ClerkLoaded>
              <SignedIn>
                <div className="flex items-center gap-x-2">
                  {/* Increase username's font size */}
                  {userRole && (
                    <span className="text-lg text-customTeal capitalize">
                      {userRole}
                    </span>
                  )}
                  {/* Increase user avatar if needed via Clerk (or via custom props) */}
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-10 h-10", // bigger avatar size
                      },
                    }}
                  />
                </div>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    variant="nextButton4"
                    size="lg"
                    className="hidden md:flex items-center space-x-2 rounded-full transition-colors duration-300"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </SignInButton>
              </SignedOut>
            </ClerkLoaded>

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Nav (dropdown) */}
        {isMenuOpen && (
          <div className="md:hidden px-4 pb-4">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`block p-3 mt-2 rounded-lg transition-all duration-200 ${
                  isActive(href)
                    ? "bg-teal-500 text-white shadow-md"
                    : "text-gray-600 hover:bg-teal-100 hover:text-teal-600"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>
    );
  }
);

Header.displayName = "Header";
