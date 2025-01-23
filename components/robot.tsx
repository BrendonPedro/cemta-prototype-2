"use client";

import { motion } from "framer-motion";
import React from "react";

export function Robot() {
  return (
    <motion.div
      className="android"
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="head">
        <div className="eyes">
          <div className="left_eye" />
          <div className="right_eye" />
        </div>
      </div>
      <div className="upper_body">
        <div className="left_arm" />
        <div className="torso" />
        <div className="right_arm" />
      </div>
      <div className="lower_body">
        <div className="left_leg" />
        <div className="right_leg" />
      </div>
    </motion.div>
  );
}
