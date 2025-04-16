import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { DropdownActions } from "@/components/ui/dropdown-actions";
import { Button } from "@/components/ui/button";
import { Eye, Monitor, Folder, Terminal, Package, Settings, RefreshCw, Trash } from "lucide-react";
import { Device } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatDistance } from "date-fns";

interface DeviceCardProps {
  device: Device;
  onRemove: (device: Device) => void;
}

export function DeviceCard({ device, onRemove }: DeviceCardProps) {
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const handleViewDetails = () => {
    navigate(`/devices/${device.id}`);
  };

  const handleRemoteScreen = () => {
    if (device.status === 'offline') {
      toast({
        title: "Device Offline",
        description: "Cannot access remote screen while device is offline",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Connecting to Remote Screen",
      description: `Establishing connection to ${device.name}...`
    });
    
    // In a real implementation, this would initiate a WebRTC connection or similar
  };

  const handleFileBrowser = () => {
    if (device.status === 'offline') {
      toast({
        title: "Device Offline",
        description: "Cannot access files while device is offline",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/files?deviceId=${device.deviceId}`);
  };

  const dropdownActions = [
    {
      label: "Send Command",
      onClick: () => navigate(`/commands?deviceId=${device.deviceId}`),
      icon: <Terminal className="h-4 w-4" />
    },
    {
      label: "Manage Apps",
      onClick: () => {
        if (device.status === 'offline') {
          toast({
            title: "Device Offline",
            description: "Cannot manage apps while device is offline",
            variant: "destructive"
          });
          return;
        }
        toast({
          title: "App Management",
          description: "Opening application manager..."
        });
      },
      icon: <Package className="h-4 w-4" />
    },
    {
      label: "System Settings",
      onClick: () => {
        if (device.status === 'offline') {
          toast({
            title: "Device Offline",
            description: "Cannot access settings while device is offline",
            variant: "destructive"
          });
          return;
        }
        toast({
          title: "System Settings",
          description: "Opening system settings manager..."
        });
      },
      icon: <Settings className="h-4 w-4" />
    },
    {
      label: "Restart Device",
      onClick: () => {
        if (device.status === 'offline') {
          toast({
            title: "Device Offline",
            description: "Cannot restart while device is offline",
            variant: "destructive"
          });
          return;
        }
        toast({
          title: "Restart Device",
          description: `Restarting ${device.name}...`
        });
      },
      icon: <RefreshCw className="h-4 w-4" />
    },
    {
      label: "Remove Device",
      onClick: () => onRemove(device),
      icon: <Trash className="h-4 w-4" />,
      variant: "destructive"
    }
  ];

  // Format last active time
  const lastActiveTime = device.lastActive 
    ? formatDistance(new Date(device.lastActive), new Date(), { addSuffix: true })
    : 'Unknown';
  
  // Display last active as "Now" if it's just now
  const displayLastActive = lastActiveTime === 'less than a minute ago' ? 'Now' : lastActiveTime;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="p-4 border-b border-gray-200 space-y-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700 truncate">{device.name}</h3>
          <StatusBadge status={device.status as any} />
        </div>
        <p className="text-sm text-gray-500 mt-1">Device ID: {device.deviceId}</p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="px-4 py-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-500">OS</p>
              <p className="text-gray-700">{device.os}</p>
            </div>
            <div>
              <p className="text-gray-500">IP Address</p>
              <p className="text-gray-700">{device.ipAddress || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Active</p>
              <p className="text-gray-700">{displayLastActive}</p>
            </div>
            <div>
              <p className="text-gray-500">User</p>
              <p className="text-gray-700">{device.user || 'Unknown'}</p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 flex items-center justify-between border-t border-gray-200">
        <div className="flex space-x-2">
          <Button variant="primary" size="sm" onClick={handleViewDetails}>
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
          
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleRemoteScreen}
            disabled={device.status === 'offline'}
          >
            <Monitor className="h-3.5 w-3.5 mr-1" />
            Screen
          </Button>
          
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleFileBrowser}
            disabled={device.status === 'offline'}
          >
            <Folder className="h-3.5 w-3.5 mr-1" />
            Files
          </Button>
        </div>
        
        <DropdownActions actions={dropdownActions} />
      </CardFooter>
    </Card>
  );
}
