import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "@shared/schema";
import { formatDistance } from "date-fns";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

interface ActivityListProps {
  activities: Activity[] | null;
  isLoading: boolean;
  limit?: number;
  showViewAll?: boolean;
}

export function ActivityList({ activities, isLoading, limit = 5, showViewAll = true }: ActivityListProps) {
  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case "command":
        return status === "failed" 
          ? { icon: "fa-times-circle", bgClass: "bg-red-100", iconClass: "text-red-600" }
          : { icon: "fa-terminal", bgClass: "bg-blue-100", iconClass: "text-blue-600" };
      case "file":
        return { icon: "fa-file-upload", bgClass: "bg-green-100", iconClass: "text-green-600" };
      case "screen":
        return { icon: "fa-desktop", bgClass: "bg-orange-100", iconClass: "text-orange-600" };
      case "status":
        return status === "offline" 
          ? { icon: "fa-times-circle", bgClass: "bg-red-100", iconClass: "text-red-600" }
          : { icon: "fa-check-circle", bgClass: "bg-green-100", iconClass: "text-green-600" };
      default:
        return { icon: "fa-info-circle", bgClass: "bg-gray-100", iconClass: "text-gray-600" };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-gray-500">No recent activity found.</p>
        </CardContent>
      </Card>
    );
  }

  const displayActivities = limit ? activities.slice(0, limit) : activities;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle>Recent Activity</CardTitle>
        {showViewAll && (
          <Link href="/activities">
            <a className="text-blue-600 text-sm font-medium">View All</a>
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {displayActivities.map((activity) => {
            const { icon, bgClass, iconClass } = getActivityIcon(activity.activityType, activity.status);
            const timeAgo = formatDistance(new Date(activity.createdAt), new Date(), { addSuffix: true });
            
            return (
              <li key={activity.id} className="border-b border-gray-200 last:border-0">
                <div className="p-4 flex items-start">
                  <div className={`flex-shrink-0 w-10 h-10 ${bgClass} rounded-full flex items-center justify-center`}>
                    <i className={`fas ${icon} ${iconClass}`}></i>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">{activity.description}</p>
                      <span className="text-xs text-gray-500">{timeAgo}</span>
                    </div>
                    {activity.deviceId && (
                      <p className="text-sm text-gray-500 mt-1">
                        Device ID: {activity.deviceId}
                      </p>
                    )}
                    {activity.status && (
                      <p className={`text-xs mt-1 ${
                        activity.status === "completed" ? "text-green-600" : 
                        activity.status === "failed" ? "text-red-600" : "text-gray-500"
                      }`}>
                        Status: {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
