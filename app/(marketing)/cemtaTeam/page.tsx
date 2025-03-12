import { AboutUs } from "@/components/AboutUs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CEMTA Team | CEMTA",
  description: "Meet the team behind CEMTA's mission to revolutionize the dining experience in Taiwan.",
};

export default function CemtaTeamPage() {
  return (
    <div>
      <AboutUs showTeamSection={true} />
    </div>
  );
}