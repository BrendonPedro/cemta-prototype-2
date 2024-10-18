// app/(main)/dashboards/layout.tsx

import React from "react";
import DashboardLayout from "@/app/shared/layouts/DashboardLayout";

type Props = {
  children: React.ReactNode;
};

const DashboardPageLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <DashboardLayout>{children}</DashboardLayout>
    </div>
  );
};

export default DashboardPageLayout;
