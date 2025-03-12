// This component can be removed as its functionality is included in RobotMenu.tsx

"use client";

import { motion } from "framer-motion";
import React from "react";

export function AnimatedMenu() {
  return (
    <motion.div
      className="relative w-32 h-40 bg-white rounded-lg shadow-lg"
      animate={{
        rotateY: [0, 10, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className="absolute top-4 left-4 right-4 h-2 bg-gray-300 rounded"
        animate={{
          width: ["60%", "80%", "60%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-10 left-4 right-4 h-2 bg-gray-300 rounded"
        animate={{
          width: ["70%", "50%", "70%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
      />
      <motion.div
        className="absolute top-16 left-4 right-4 h-2 bg-gray-300 rounded"
        animate={{
          width: ["50%", "75%", "50%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.4,
        }}
      />
    </motion.div>
  );
}
