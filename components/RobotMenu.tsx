"use client";

import { motion } from "framer-motion";

const Robot = () => (
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
        <div className="left_eye"></div>
        <div className="right_eye"></div>
      </div>
    </div>
    <div className="upper_body">
      <div className="left_arm"></div>
      <div className="torso"></div>
      <div className="right_arm"></div>
    </div>
    <div className="lower_body">
      <div className="left_leg"></div>
      <div className="right_leg"></div>
    </div>
  </motion.div>
);

const AnimatedMenu = () => (
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

interface RobotMenuProps {
  className?: string;
  scale?: number;
}

export const RobotMenu: React.FC<RobotMenuProps> = ({ className = "", scale = 1 }) => {
  return (
    <motion.div 
      className={`flex justify-center items-center space-x-12 ${className}`}
      style={{ transform: `scale(${scale})` }}
    >
      <Robot />
      <AnimatedMenu />
    </motion.div>
  );
};

export default RobotMenu;