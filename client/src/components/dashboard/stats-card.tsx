import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface StatItem {
  icon: string;
  iconClass: string;
  bgClass: string;
  label: string;
  value: number | string;
}

interface StatsCardProps {
  stats: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    pendingCommands: number;
  } | null;
  isLoading: boolean;
}

export function StatsCard({ stats, isLoading }: StatsCardProps) {
  const statItems: StatItem[] = [
    {
      icon: "fa-desktop",
      iconClass: "text-blue-600",
      bgClass: "bg-blue-100",
      label: "Total Devices",
      value: stats?.totalDevices || 0
    },
    {
      icon: "fa-signal",
      iconClass: "text-green-600",
      bgClass: "bg-green-100",
      label: "Online Devices",
      value: stats?.onlineDevices || 0
    },
    {
      icon: "fa-power-off",
      iconClass: "text-red-600",
      bgClass: "bg-red-100",
      label: "Offline Devices",
      value: stats?.offlineDevices || 0
    },
    {
      icon: "fa-exclamation-triangle",
      iconClass: "text-orange-600",
      bgClass: "bg-orange-100",
      label: "Pending Commands",
      value: stats?.pendingCommands || 0
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4 flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className={`rounded-full ${item.bgClass} p-3`}>
                <i className={`fas ${item.icon} ${item.iconClass} text-lg`}></i>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
