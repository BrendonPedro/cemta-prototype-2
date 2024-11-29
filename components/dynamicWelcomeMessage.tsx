/**
 * @file DynamicWelcomeMessage.tsx
 * @description A component that displays a typing animation welcome message for both authenticated and unauthenticated users
 */

import React, { useState, useEffect, useCallback } from "react";

// Component Props Interface
interface DynamicWelcomeMessageProps {
  username?: string | null;
  className?: string;
  isSignedIn?: boolean;
}

// Constants for animation configuration
const TYPING_SPEED = 100; // milliseconds per character
const DEFAULT_MESSAGE = "Welcome! Please sign in.";

/**
 * DynamicWelcomeMessage Component
 * Displays a welcome message with a typewriter effect
 */
const DynamicWelcomeMessage: React.FC<DynamicWelcomeMessageProps> = ({
  username,
  className = '',
  isSignedIn = false
}) => {
  const [displayedText, setDisplayedText] = useState("");
  
  // Determine the message based on auth state
  const fullText = isSignedIn && username 
    ? `Welcome, ${username}!`
    : DEFAULT_MESSAGE;

  // Typing animation effect
  useEffect(() => {
    let index = 0;
    let isAnimating = true;

    // Reset text when message changes
    setDisplayedText("");

    // Create the typing interval
    const intervalId = setInterval(() => {
      if (!isAnimating) return;

      setDisplayedText(fullText.slice(0, index + 1));
      index++;

      // Clear interval when animation is complete
      if (index === fullText.length) {
        clearInterval(intervalId);
      }
    }, TYPING_SPEED);

    // Cleanup function to prevent memory leaks
    return () => {
      isAnimating = false;
      clearInterval(intervalId);
    };
  }, [fullText]);

  return (
    <div 
      className={`mt-2 text-md font-medium text-black max-w-[400px] flex-wrap welcome-message ${className}`}
      aria-live="polite"
    >
      <span className="typing">{displayedText}</span>
    </div>
  );
};

export default DynamicWelcomeMessage;

/**
 * Component Summary
 * 
 1. Component Purpose:
    - Creates a typing animation effect for welcome messages
    - Used in the marketing page (app/(marketing)/page.tsx, lines 89-91)
    - Enhances user experience with dynamic text animation
2. Integration Points:
    - Tailwind Config (tailwind.config.ts): Defines custom animations and text styles
    - Global CSS (globals.css): Contains welcome-message and typing animation styles
    - Marketing Page: Implements the component for authenticated and unauthenticated users
 */