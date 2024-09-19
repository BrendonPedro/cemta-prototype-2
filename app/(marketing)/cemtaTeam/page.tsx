"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";

const teamMembers = [
  { name: "Brendon Pedro", image: "Brendon4.jpeg" },
  { name: "Daniele Melloti", image: "daniele.png" },
  { name: "Daren Smith", image: "Daren.jpeg" },
  { name: "Hakim Nasution", image: "Hakim.jpeg" },
];

const TeamMember = ({ name, image }: { name: string; image: string }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="relative group"
  >
    <div className="overflow-hidden rounded-lg shadow-lg">
      <Image
        src={`/team_images/${image}`}
        alt={`${name}`}
        width={250}
        height={250}
        className="object-cover w-full h-64 transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
      <div className="absolute bottom-4 left-4 right-4 p-2 text-center bg-customBlack2 bg-opacity-90 rounded-lg border-2 border-transparent transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          {name}
        </h3>
      </div>
    </div>
    <motion.div
      className="absolute -inset-0.5 bg-transparent rounded-lg opacity-0 group-hover:opacity-50 blur"
      initial={false}
      animate={{ opacity: 0 }}
      whileHover={{ opacity: 0.5 }}
      transition={{ duration: 0.3 }}
    />
  </motion.div>
);

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

export default function CemtaTeamPage() {
  const [isCemtaHovered, setIsCemtaHovered] = useState(false);
   const [isHovered, setIsHovered] = useState(false);
  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold mb-6 text-black relative inline-block">
            Meet the{" "}
            <span
              className="relative inline-block"
              onMouseEnter={() => setIsCemtaHovered(true)}
              onMouseLeave={() => setIsCemtaHovered(false)}
            >
              <span
                className={`
                font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack relative z-10
                before:content-[''] before:absolute before:inset-0
                before:bg-gradient-to-br before:from-transparent before:via-white before:to-transparent
                before:opacity-0
                after:content-[''] after:absolute after:inset-0
                after:bg-gradient-to-br after:from-transparent after:via-white after:to-transparent
                after:opacity-0 after:transition-opacity after:duration-1000
                ${isCemtaHovered ? "after:opacity-10" : ""}
              `}
              >
                CEMTA
              </span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
            </span>{" "}
            Team
          </h1>
          <p className="text-xl text-customBlack2 max-w-2xl mx-auto">
            Innovators in Enhancing Your Dining Experience Through Innovative
            Menu Design and Technology Advancement
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {teamMembers.map((member) => (
            <TeamMember key={member.name} {...member} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-semibold mb-8 text-customBlack2 relative inline-block">
            Transforming Menus with{" "}
            <span
              className="relative inline-block"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <span
                className={`
              bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack font-bold relative z-10
              before:content-[''] before:absolute before:inset-0
              before:bg-gradient-to-br before:from-transparent before:via-white before:to-transparent
              before:opacity-0
              after:content-[''] after:absolute after:inset-0
              after:bg-gradient-to-br after:from-transparent after:via-white after:to-transparent
              after:opacity-0 after:transition-opacity after:duration-1000
              ${isHovered ? "after:opacity-10" : ""}
            `}
              >
                AI
              </span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
            </span>
          </h2>
          <div className="flex justify-center items-center space-x-12">
            <Robot />
            <AnimatedMenu />
          </div>
        </motion.div>
      </div>
    </div>
  );
}