"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Brendon Pedro",
    role: "Co-Founder & CEO",
    bio: "Leading CEMTA's vision to revolutionize menu translation and cultural exchange.",
    image: "/team_images/Brendon4.jpeg",
  },
  {
    name: "Daniele Melotti",
    role: "Co-Founder & CTO",
    bio: "Technical lead specializing in AI and machine learning implementations.",
    image: "/team_images/daniele.png",
  },
  {
    name: "Daren Smith",
    role: "Head of Product",
    bio: "Product strategist with deep understanding of user and market needs.",
    image: "/team_images/Daren1.jpg",
  },
  {
    name: "Hakim Nasution",
    role: "Head of Operations",
    bio: "Operations expert focusing on partnerships and community growth.",
    image: "/team_images/Hakim.jpeg",
  },
  {
    name: "Harits Nasution",
    role: "Head of Development",
    bio: "Lead developer with expertise in full-stack development and cloud architecture.",
    image: "/team_images/Harits1.jpg",
  },
];

export const AboutUs = () => {
  return (
    <div className="min-h-screen pt-20 relative">
      {/* Background Logo */}
      <div className="fixed inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <Image
          src="/cemta_logo_idea1.svg"
          alt="CEMTA logo"
          fill
          style={{ objectFit: "cover" }}
          quality={100}
          priority
        />
      </div>

      {/* Content Wrapper - Remove the white container */}
      <div className="relative space-y-24"> {/* Increased space between sections */}
        {/* Hero Section - Teal gradient */}
        <motion.section className="bg-gradient-to-br from-white via-teal-50 to-teal-400 rounded-[2rem] mx-4 lg:mx-12 p-8 shadow-xl">
          <div className="container mx-auto px-4 py-16 text-center relative z-10">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Bridging Cultural Gaps Through{" "}
              <motion.span
                initial={{ rotate: 0 }}
                animate={{ rotate: -3 }}
                className="inline-block relative"
              >
                <span className="relative z-10 bg-gradient-to-r from-teal-500 via-teal-800 to-teal-500 bg-clip-text text-transparent">
                  Technology
                </span>
                <span className="absolute inset-0 border-2 border-teal-500/30 rounded-lg transform -rotate-1"></span>
                <span className="absolute inset-0 border-2 border-teal-500/20 rounded-lg transform rotate-1"></span>
                <span className="absolute inset-0 bg-teal-500/5 blur-sm rounded-lg"></span>
              </motion.span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              CEMTA is revolutionizing the dining experience in Taiwan by making local cuisine accessible to everyone through accurate menu translations and cultural insights.
            </p>
          </div>
        </motion.section>

        {/* Mission Section - White with teal accents */}
        <section className="bg-gradient-to-bl from-white via-teal-50 to-teal-400 rounded-[3rem] mx-4 lg:mx-12 p-8 shadow-xl border border-teal-100">
          <div className="container mx-auto px-4">
            <motion.div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent mb-8">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                We're on a mission to transform how people experience Taiwan's rich culinary culture. By combining advanced AI technology with community engagement, we're breaking down language barriers and creating authentic connections through food.
              </p>
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border border-teal-100">
                  <h3 className="font-semibold text-xl mb-2 text-teal-900">Innovation</h3>
                  <p className="text-gray-600">Leveraging AI and community wisdom for accurate translations</p>
                </div>
                <div className="p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border border-teal-100">
                  <h3 className="font-semibold text-xl mb-2 text-teal-900">Community</h3>
                  <p className="text-gray-600">Building bridges between local restaurants and international diners</p>
                </div>
                <div className="p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border border-teal-100">
                  <h3 className="font-semibold text-xl mb-2 text-teal-900">Culture</h3>
                  <p className="text-gray-600">Preserving authenticity while making cuisine accessible</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Team Section - Strong teal gradient */}
        <section className="bg-gradient-to-br from-teal-400 via-teal-50 to-white rounded-[2.5rem] mx-4 lg:mx-12 p-8 shadow-xl">
          <div className="container mx-auto px-4">
            <motion.div className="text-center mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent mb-4">
                Meet Our Team
              </h2>
              <p className="text-lg text-gray-600">
                A diverse group of innovators passionate about connecting cultures through food
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.5 }}
                  className="relative group"
                >
                  <div className="overflow-hidden rounded-lg shadow-lg bg-white">
                    <div className="relative">
                      <Image
                        src={member.image}
                        alt={member.name}
                        width={250}
                        height={250}
                        className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="p-4 bg-white transform transition-transform duration-300">
                      <h3 className="text-lg font-semibold text-gray-900">{member.name}</h3>
                      <p className="text-sm text-teal-600 font-medium">{member.role}</p>
                      <p className="text-sm text-gray-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {member.bio}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Vision Section - Light gradient */}
        <section className="bg-gradient-to-tr from-white via-teal-50 to-teal-400 rounded-[4rem] mx-4 lg:mx-12 p-8 shadow-xl mb-12">
          <div className="container mx-auto px-4">
            <motion.div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-teal-50 to-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-teal-800 bg-clip-text text-transparent mb-6">
                Our Vision
              </h2>
              <p className="text-lg text-gray-600">
                To create a world where language is never a barrier to experiencing the joy and culture of local cuisine. Starting with Taiwan, we're building a platform that brings people together through food, technology, and community.
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
};