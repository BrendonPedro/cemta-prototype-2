"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import {
  MapPin,
  Camera,
  ChevronRight,
  Loader2,
  Search,
  RefreshCw,
  Loader,
  AlertCircle,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  useUser,
} from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from 'next/navigation';

// UI Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RobotMenu } from "@/components/RobotMenu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Hooks and services
import { useAuth } from "@/components/AuthProvider";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { firebaseConfig } from "@/config/firebaseConfig";
import DynamicWelcomeMessage from "@/components/dynamicWelcomeMessage";

// Constants
import { FALLBACK_IMAGE, MENU_DEMO_IMAGE } from "@/app/constants/fallbackImages";


// Initialize Firebase
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(firebaseApp);

export const HomepageSections = () => {
  const router = useRouter();
  const { isLoaded: clerkLoaded } = useUser();
  const { firebaseToken, userRole } = useAuth();
  const [username, setUsername] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cemta_username');
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUsernameLoading, setIsUsernameLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsUsernameLoading(true); // Set loading to true when starting fetch
      
      if (!firebaseToken) {
        setIsUsernameLoading(false);
        return;
      }

      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            const fetchedUsername = userData?.user_info?.user_name || null;
            
            if (fetchedUsername) {
              localStorage.setItem('cemta_username', fetchedUsername);
            }
            
            setUsername(fetchedUsername);
          }
        }
      } catch (error) {
        console.error('Error fetching username:', error);
      } finally {
        setIsUsernameLoading(false);
      }
    };

    fetchUserData();
  }, [firebaseToken]);

  // Clear username from cache when user signs out
  useEffect(() => {
    if (!firebaseToken && username) {
      localStorage.removeItem('cemta_username');
      setUsername(null);
    }
  }, [firebaseToken, username]);

  return (
    <div className="min-h-screen">
      {/* ----------------------------------------------------------------
        1. Hero Section - White Background
      ---------------------------------------------------------------- */}
      <section className="w-full pt-20 bg-white">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between py-16 px-4 lg:px-8">
            {/* Left Column - Text Content */}
            <div className="lg:w-1/2 space-y-8 mb-12 lg:mb-0 relative">
              {/* Background Logo */}
              <div className="absolute inset-0 z-0">
                <div className="fixed inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <Image
                    src="/cemta_logo_idea1.svg"
                    alt="CEMTA Logo Background"
                    fill
                    style={{ objectFit: "cover" }}
                    quality={100}
                    priority
                  />
                </div>
              </div>
              
              {/* Existing content with added z-index */}
              <div className="space-y-6 relative z-10">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-5xl lg:text-6xl font-bold text-gray-900"
                >
                  Introducing{" "}
                  <motion.span
                    initial={{ rotate: 0 }}
                    animate={{ rotate: -3 }}
                    className="cemta-title inline-block relative font-bold text-5xl md:text-6xl"
                  >
                    <span className="relative z-10 bg-gradient-to-r from-teal-500 via-teal-800 to-teal-500 bg-clip-text text-transparent">
                      CEMTA
                    </span>
                    {/* Sleek border effect */}
                    <span className="absolute inset-0 border-2 border-teal-500/30 rounded-lg transform -rotate-1 transition-transform duration-300 group-hover:rotate-0"></span>
                    <span className="absolute inset-0 border-2 border-teal-500/20 rounded-lg transform rotate-1 transition-transform duration-300 group-hover:rotate-0"></span>
                    {/* Subtle glow effect */}
                    <span className="absolute inset-0 bg-teal-500/5 blur-sm rounded-lg"></span>
                  </motion.span>
                </motion.h1>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl lg:text-5xl font-bold text-gray-900"
                >
                  An <span className="bg-teal-600 to-black bg-clip-text text-transparent">
                    AI Menu
                    </span> Platform
                </motion.h2>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-3xl lg:text-4xl font-bold text-gray-900"
                >
                  Connecting Diners to Local Cuisine
                </motion.h2>
              </div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-xl text-gray-600 max-w-2xl"
              >
                Experience Taiwan&apos;s rich culinary scene without language
                barriers. CEMTA provides a user-friendly menu display with translations in one place. 
                Browse nearby restaurants, explore their menus, and easily share with friends for effortless dining planning.
              </motion.p>

              {/* Auth Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="space-y-4"
              >
                <ClerkLoading>
                  <Loader className="h-8 w-8 text-teal-600 animate-spin" />
                </ClerkLoading>
                <ClerkLoaded>
                  <SignedOut>
                    <div className="flex items-center gap-2">
                      <SignUpButton mode="modal">
                        <Button
                          size="lg"
                          variant="nextButton4"
                          className="w-full lg:w-auto transform transition-all duration-300 hover:shadow-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Discover
                          </div>
                        </Button>
                      </SignUpButton>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-6 w-6 text-black cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-white text-black">
                            <p>Sign up to discover nearby restaurants and menus</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </SignedOut>
                  <SignedIn>
                    <div className="flex items-center gap-2">
                      <Button
                        size="lg"
                        variant="nextButton4"
                        className="w-full lg:w-auto transform transition-all duration-300 hover:shadow-lg"
                        disabled={isLoading}
                        onClick={async () => {
                          setIsLoading(true);
                          router.push(`/dashboards/${userRole || "user"}`);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Search className="h-5 w-5" />
                          )}
                          {isLoading ? "Loading..." : "Discover"}
                        </div>
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                          <Info className="h-6 w-6 text-black cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-white text-black">
                            <p>Discover nearby restaurants and menus</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </SignedIn>
                </ClerkLoaded>
              </motion.div>

              {/* Welcome Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-lg text-amber-500 font-medium"
              >
                <div className="max-w-[600px]">
                  <DynamicWelcomeMessage
                    username={username}
                    isSignedIn={!!firebaseToken && !!username}
                    isLoading={isUsernameLoading || !clerkLoaded}
                  />
                </div>
              </motion.div>
            </div>

            {/* Right Column - Increased max-width */}
            <div className="flex-1 relative lg:max-w-2xl">
              <motion.div
                initial={{ rotate: -5 }}
                whileHover={{ rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="relative w-full aspect-square max-w-lg mx-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-200 to-transparent rounded-3xl" />
                <div className="relative z-10 transform hover:scale-105 transition-transform duration-300">
                  <div className="flex justify-center items-center">
                    <RobotMenu scale={0.8} className="opacity-90" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
        2. Menu Translation Section - Darker Teal to White
      ---------------------------------------------------------------- */}
      <section className="w-full bg-teal-200 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-bold text-black mb-10 text-center">
              Instant <span className="text-4xl font-bold bg-clip-text text-transparent bg-teal-900">
                MENU </span>Translation
            </h2>
            <Card className="p-8 rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl">
              <motion.div
                className="flex flex-col md:flex-row items-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Left Text Content */}
                <div className="flex-1 mb-8 md:mb-0 md:mr-8">
                  <h3 className="text-3xl font-semibold mb-6 text-teal-900">
                    Decode Any Menu in Seconds
                  </h3>
                  <p className="text-xl text-gray-600 mb-6">
                    Our AI-powered OCR technology translates Chinese menus
                    instantly, making your dining experience seamless.
                  </p>
                  <div className="space-y-6 mb-8">
                    <motion.div
                      className="flex items-center space-x-4"
                      whileHover={{ x: 10 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="w-12 h-12 bg-teal-700/10 rounded-full flex items-center justify-center">
                        <Camera className="h-6 w-6 text-teal-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Snap a Photo</h4>
                        <p className="text-gray-600">
                          Capture any Chinese menu instantly
                        </p>
                      </div>
                    </motion.div>
                    <motion.div
                      className="flex items-center space-x-4"
                      whileHover={{ x: 10 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="w-12 h-12 bg-teal-700/10 rounded-full flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-teal-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold">AI Processing</h4>
                        <p className="text-gray-600">
                          Advanced OCR technology at work
                        </p>
                      </div>
                    </motion.div>
                    <motion.div
                      className="flex items-center space-x-4"
                      whileHover={{ x: 10 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <div className="w-12 h-12 bg-teal-700/10 rounded-full flex items-center justify-center">
                        <ChevronRight className="h-6 w-6 text-teal-700" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Instant Translation</h4>
                        <p className="text-gray-600">
                          Get accurate translations in seconds
                        </p>
                      </div>
                    </motion.div>
                  </div>
                  <Link href="/menuAnalyzer">
                    <Button className="bg-gradient-to-r from-teal-700 to-teal-900 hover:from-teal-900 hover:to-teal-700 text-white rounded-full text-lg py-6 px-8 transition-all duration-300 transform hover:scale-105">
                      <Camera className="mr-2 h-5 w-5" /> Translate Now
                    </Button>
                  </Link>
                </div>

                {/* Right Image Content */}
                <div className="lg:w-1/2 relative">
                  <div className="relative w-full h-[400px] flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-customTeal to-transparent rounded-3xl" />
                    <div className="absolute animate-float bottom-8 left-8 z-20 bg-white bg-opacity-90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
                      <span className="text-teal-700 font-semibold">
                        中文 → English
                      </span>
                    </div>
                    <div className="relative w-[350px]">
                      <Image
                        src="/menu_translation.svg"
                        alt="Menu Translation Illustration"
                        width={350}
                        height={350}
                        priority
                        className="relative z-10 w-full h-auto scale-[2] hover:scale-[2.1] transition-transform duration-300"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
        3. Community Section - White Background
      ---------------------------------------------------------------- */}
      <section className="w-full bg-teal-100 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-bold text-teal-900 mb-10 text-center">
              Join Our Foodie Community
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Discover Local Gems Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="p-8 h-full rounded-3xl bg-gradient-to-br from-teal-700/10 to-white shadow-lg hover:shadow-xl">
                  <div className="flex flex-col h-full">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-teal-700/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <MapPin className="h-8 w-8 text-teal-700" />
                      </div>
                      <h3 className="text-xl font-semibold text-center mb-4 text-teal-900">
                        Discover Local Gems
                      </h3>
                      <p className="text-gray-600 text-center">
                        Find authentic local restaurants and explore their
                        menus with confidence
                      </p>
                    </div>
                    <div className="mt-auto text-center">
                      <Button
                        variant="nextButton"
                        className="rounded-full bg-teal-700 text-white hover:bg-teal-900 transition-colors duration-300"
                      >
                        Explore Restaurants
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Share Your Finds Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="p-8 h-full rounded-3xl bg-gradient-to-br from-white to-teal-700/10 shadow-lg hover:shadow-xl">
                  <div className="flex flex-col h-full">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-teal-700/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <Search className="h-8 w-8 text-teal-700" />
                      </div>
                      <h3 className="text-xl font-semibold text-center mb-4 text-teal-900">
                        Share Your Finds
                      </h3>
                      <p className="text-gray-600 text-center">
                        Help others discover great food by sharing your
                        experiences and translations
                      </p>
                    </div>
                    <div className="mt-auto text-center">
                      <Button
                        variant="nextButton"
                        className="rounded-full bg-teal-700 text-white hover:bg-teal-900 transition-colors duration-300"
                      >
                        Start Sharing
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Earn Rewards Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="p-8 h-full rounded-3xl bg-gradient-to-br from-teal-700/10 to-white shadow-lg hover:shadow-xl">
                  <div className="flex flex-col h-full">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-teal-700/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <ChevronRight className="h-8 w-8 text-teal-700" />
                      </div>
                      <h3 className="text-xl font-semibold text-center mb-4 text-teal-900">
                        Earn Rewards
                      </h3>
                      <p className="text-gray-600 text-center">
                        Get points and unlock perks for contributing to the
                        community
                      </p>
                    </div>
                    <div className="mt-auto text-center">
                      <Button
                        variant="nextButton"
                        className="rounded-full bg-teal-700 text-white hover:bg-teal-900 transition-colors duration-300"
                      >
                        View Rewards
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
        4. User Journey Section - Slightly Dark Teal / White
      ---------------------------------------------------------------- */}
      <section className="w-full bg-gradient-to-br from-white to-teal-50 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-bold text-teal-900 mb-10 text-center">
              Embark on Your Culinary Journey
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Demo Image Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="order-2 lg:order-1"
              >
                <Card className="p-8 rounded-3xl bg-white/90 backdrop-blur-sm shadow-xl h-full">
                  <motion.div
                    initial={{ rotate: -5 }}
                    whileHover={{ rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="relative w-full h-full min-h-[400px]"
                  >
                    <Image
                      src={MENU_DEMO_IMAGE}
                      alt="Menu translation demo"
                      fill
                      sizes="(max-width: 768px) 100vw, 500px"
                      className="rounded-3xl shadow-2xl object-cover h-auto"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = FALLBACK_IMAGE;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-3xl" />
                    <div className="absolute bottom-8 left-8 right-8 text-white">
                      <h3 className="text-2xl font-bold mb-2">
                        Experience Local Cuisine
                      </h3>
                      <p className="text-white/90">
                        Discover authentic dishes with confidence using our
                        translation tools
                      </p>
                    </div>
                  </motion.div>
                </Card>
              </motion.div>

              {/* Tabs Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="order-1 lg:order-2"
              >
                <Card className="p-8 rounded-3xl bg-white/90 backdrop-blur-sm shadow-xl h-full">
                  <Tabs defaultValue="foodie" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 p-2">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <TabsTrigger
                          value="foodie"
                          className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-700 data-[state=active]:to-black data-[state=active]:text-white transition-all duration-300"
                        >
                          <div className="flex items-center space-x-2">
                            <Search className="w-4 h-4" />
                            <span>Food Explorer</span>
                          </div>
                        </TabsTrigger>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <TabsTrigger
                          value="translator"
                          className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-700 data-[state=active]:to-black data-[state=active]:text-white transition-all duration-300"
                        >
                          <div className="flex items-center space-x-2">
                            <Camera className="w-4 h-4" />
                            <span>Translation Partner</span>
                          </div>
                        </TabsTrigger>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <TabsTrigger
                          value="restaurant"
                          className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-700 data-[state=active]:to-black data-[state=active]:text-white transition-all duration-300"
                        >
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>Restaurant Owner</span>
                          </div>
                        </TabsTrigger>
                      </motion.div>
                    </TabsList>

                    <div className="mt-8 relative min-h-[250px]">
                      <AnimatePresence>
                        {/* Food Explorer Content */}
                        <TabsContent key="foodie" value="foodie" className="absolute w-full">
                          <motion.div
                            key="foodie-motion"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-gradient-to-br from-teal-700/5 to-white p-8 rounded-3xl"
                          >
                            <h3 className="text-2xl font-semibold mb-4 text-teal-900">
                              Discover New Culinary Horizons
                            </h3>
                            <p className="text-gray-600 mb-6">
                              Embark on a gastronomic adventure, explore diverse
                              cuisines, and share your experiences with a global
                              community of food lovers.
                            </p>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <Button className="bg-gradient-to-r from-teal-700 to-black hover:from-black hover:to-teal-700 text-white rounded-full py-4 px-6 transition-all duration-300">
                                Start Your Foodie Journey{" "}
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                            </motion.div>
                          </motion.div>
                        </TabsContent>

                        {/* Translation Partner Content */}
                        <TabsContent key="translator" value="translator" className="absolute w-full">
                          <motion.div
                            key="translator-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-gradient-to-br from-white to-teal-700/5 p-8 rounded-3xl"
                          >
                            <h3 className="text-2xl font-semibold mb-4 text-teal-900">
                              Bridge Culinary Cultures
                            </h3>
                            <p className="text-gray-600 mb-6">
                              Use your language skills to help others explore
                              new cuisines. Contribute translations and earn
                              rewards while making a difference.
                            </p>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <Button className="bg-gradient-to-r from-teal-700 to-black hover:from-black hover:to-teal-700 text-white rounded-full py-4 px-6 transition-all duration-300">
                                Become a Translation Partner{" "}
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                            </motion.div>
                          </motion.div>
                        </TabsContent>

                        {/* Restaurant Owner Content */}
                        <TabsContent key="restaurant" value="restaurant" className="absolute w-full">
                          <motion.div
                            key="restaurant-content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="bg-gradient-to-br from-teal-700/5 to-white p-8 rounded-3xl"
                          >
                            <h3 className="text-2xl font-semibold mb-4 text-teal-900">
                              Showcase Your Culinary Masterpieces
                            </h3>
                            <p className="text-gray-600 mb-6">
                              Put your restaurant on the global map. Reach food
                              enthusiasts from around the world and let your
                              cuisine shine.
                            </p>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400 }}
                            >
                              <Button className="bg-gradient-to-r from-teal-700 to-black hover:from-black hover:to-teal-700 text-white rounded-full py-4 px-6 transition-all duration-300">
                                List Your Restaurant{" "}
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                            </motion.div>
                          </motion.div>
                        </TabsContent>
                      </AnimatePresence>
                    </div>
                  </Tabs>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomepageSections;
