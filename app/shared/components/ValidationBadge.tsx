// app/shared/components/ValidationBadge.tsx

import React from "react";
import { CheckCircle, AlertCircle, Shield } from "lucide-react";

type ValidationStatus = "community" | "restaurant" | "validator" | "cemta";

interface ValidationBadgeProps {
  status: ValidationStatus;
}

const ValidationBadge: React.FC<ValidationBadgeProps> = ({ status }) => {
  const badgeConfig = {
    community: {
      icon: AlertCircle,
      color: "text-yellow-500",
      text: "Community Uploaded",
    },
    restaurant: {
      icon: CheckCircle,
      color: "text-blue-500",
      text: "Restaurant Verified",
    },
    validator: {
      icon: CheckCircle,
      color: "text-green-500",
      text: "Validator Approved",
    },
    cemta: {
      icon: Shield,
      color: "text-purple-500",
      text: "CEMTA Validated",
    },
  };

  const { icon: Icon, color, text } = badgeConfig[status];

  return (
    <div className={`flex items-center ${color}`}>
      <Icon className="w-4 h-4 mr-1" />
      <span className="text-sm">{text}</span>
    </div>
  );
};

export default ValidationBadge;
