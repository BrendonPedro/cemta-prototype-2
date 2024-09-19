// app/dashboards/validator/page.tsx
import React from "react";
import DashboardLayout from "@/app/shared/layouts/DashboardLayout";

const sidebarItems = [
  { name: "Review Queue", href: "/dashboards/validator/review-queue" },
  { name: "My Contributions", href: "/dashboards/validator/contributions" },
  {
    name: "Community Uploads",
    href: "/dashboards/validator/community-uploads",
  },
];

export default function ValidatorDashboard() {
  const userRole = "validator"; // or 'partner', 'validator', 'user' as appropriate
  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole={userRole}>
      <h1 className="text-3xl font-semibold text-gray-800">
        Validator Dashboard
      </h1>
      {/* Add validator-specific content here */}
      {/* Include a section for community uploads and restaurant validations */}
    </DashboardLayout>
  );
}
