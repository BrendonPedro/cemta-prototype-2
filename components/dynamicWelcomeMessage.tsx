import React, { useState, useEffect } from "react";

interface DynamicWelcomeMessageProps {
  username: string;
}

const DynamicWelcomeMessage: React.FC<DynamicWelcomeMessageProps> = ({
  username,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const fullText = `Welcome, ${username}!`;

  useEffect(() => {
    let index = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(fullText.slice(0, index + 1));
      index++;
      if (index === fullText.length) {
        clearInterval(intervalId);
      }
    }, 100); // 0.1s interval

    return () => clearInterval(intervalId);
  }, [fullText]);

  return (
    <div className="mt-2 text-md font-medium text-teal-800 max-w-[400px] flex-wrap welcome-message">
      <span className="typing">{displayedText}</span>
    </div>
  );
};

export default DynamicWelcomeMessage;
