/**
 * @file DynamicWelcomeMessage.tsx
 * @description A component that displays a typing animation welcome message for both authenticated and unauthenticated users
 */

import React, { useState, useEffect, useCallback } from "react";

// Component Props Interface
interface DynamicWelcomeMessageProps {
  username: string | null;
  isSignedIn: boolean;
  isLoading: boolean;
}

// Constants for animation configuration
const TYPING_SPEED = 100; // milliseconds per character
const DEFAULT_MESSAGE = "Welcome Guest! A World of Food Awaits.";

/**
 * DynamicWelcomeMessage Component
 * Displays a welcome message with a typewriter effect
 */
const DynamicWelcomeMessage: React.FC<DynamicWelcomeMessageProps> = ({
  username,
  isSignedIn,
  isLoading
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [messageToType, setMessageToType] = useState<string>("");
  
  // Set the message with a delay to ensure auth state is stable
  useEffect(() => {
    if (isLoading) return;

    // Add a delay before starting to type
    const delayTimer = setTimeout(() => {
      const newMessage = isSignedIn && username 
        ? `Welcome, ${username}!`
        : DEFAULT_MESSAGE;
      setMessageToType(newMessage);
    }, 1000); // 1 second delay

    return () => clearTimeout(delayTimer);
  }, [isLoading, isSignedIn, username]);

  // Start typing animation only after we have a stable message
  useEffect(() => {
    if (!messageToType) return;

    let index = 0;
    let isAnimating = true;

    setDisplayedText("");
    setIsTypingComplete(false);

    const intervalId = setInterval(() => {
      if (!isAnimating) return;

      setDisplayedText(messageToType.slice(0, index + 1));
      index++;

      if (index === messageToType.length) {
        clearInterval(intervalId);
        setIsTypingComplete(true);
      }
    }, TYPING_SPEED);

    return () => {
      isAnimating = false;
      clearInterval(intervalId);
    };
  }, [messageToType]);

  // Show empty state while waiting for initial delay
  if (isLoading || !messageToType) {
    return (
      <div className="mt-2 text-md font-medium text-black max-w-[400px] flex-wrap welcome-message">
        <span className="opacity-0">.</span>
      </div>
    );
  }

  return (
    <div 
      className="mt-2 text-md font-medium text-black max-w-[400px] flex-wrap welcome-message"
      aria-live="polite"
    >
      <span className={`${isTypingComplete ? 'typing-complete' : 'typing'}`}>
        {displayedText}
      </span>
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