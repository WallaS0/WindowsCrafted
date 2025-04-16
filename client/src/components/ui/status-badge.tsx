import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "online" | "offline" | "pending" | "completed" | "failed" | "warning";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    online: {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      dotColor: "bg-green-600",
      label: "Online"
    },
    offline: {
      bgColor: "bg-gray-100",
      textColor: "text-gray-600",
      dotColor: "bg-gray-600",
      label: "Offline"
    },
    pending: {
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      dotColor: "bg-yellow-600",
      label: "Pending"
    },
    completed: {
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      dotColor: "bg-green-600",
      label: "Completed"
    },
    failed: {
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      dotColor: "bg-red-600",
      label: "Failed"
    },
    warning: {
      bgColor: "bg-orange-100",
      textColor: "text-orange-800",
      dotColor: "bg-orange-600",
      label: "Warning"
    }
  };

  const config = statusConfig[status];

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span className={cn("h-2 w-2 mr-1 rounded-full", config.dotColor)} />
      {config.label}
    </span>
  );
}
