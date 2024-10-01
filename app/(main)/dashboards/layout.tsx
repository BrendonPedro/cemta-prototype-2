// /dashboards/layout.tsx
import React from "react";
import DashboardLayout from "@/app/shared/layouts/DashboardLayout";

type Props = {
  children: React.ReactNode;
};

const DashboardPageLayout = ({ children }: Props) => {
  return <DashboardLayout>{children}</DashboardLayout>;
};

export default DashboardPageLayout;
