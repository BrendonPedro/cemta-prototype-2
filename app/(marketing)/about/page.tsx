import { AboutUs } from "@/components/AboutUs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | CEMTA",
  description: "Learn about CEMTA's mission to revolutionize the dining experience in Taiwan through AI-powered menu translations and cultural insights.",
};

export default function AboutUsPage() {
  return (
    <main>
      <AboutUs />
    </main>
  );
}