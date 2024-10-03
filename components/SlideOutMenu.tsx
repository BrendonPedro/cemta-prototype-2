// components/SlideOutMenu.tsx

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SlideOutMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="cemta"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 bottom-4 z-50"
      >
        <Menu />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4"
            >
              <X />
            </Button>

            <nav className="mt-12 space-y-4">
              <Link
                href="/profile"
                className="block text-gray-600 hover:text-teal-600"
              >
                Profile
              </Link>
              <Link
                href="/settings"
                className="block text-gray-600 hover:text-teal-600"
              >
                Settings
              </Link>
              <Link
                href="/help"
                className="block text-gray-600 hover:text-teal-600"
              >
                Help
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};
