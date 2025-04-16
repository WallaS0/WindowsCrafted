import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import { DeviceCard } from "@/components/dashboard/device-card";
import { AddDeviceModal } from "@/components/dashboard/add-device-modal";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Device, Activity } from "@shared/schema";
import { socketClient } from "@/lib/socket";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState({ online: true, offline: true });
  const [platformFilter, setpPlatformFilter] = useState({ android: true, ios: true, windows: true });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch stats
  const { 
    data: stats,
    isLoading: isLoadingStats 
  } = useQuery<{
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    pendingCommands: number;
  }>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000  // Refresh every 30 seconds
  });

  // Fetch devices
  const { 
    data: devices = [],
    isLoading: isLoadingDevices,
    isError: isDevicesError,
    error: devicesError
  } = useQuery<Device[]>({
    queryKey: ["/api/devices"]
  });

  // Fetch activities
  const { 
    data: activities = [],
    isLoading: isLoadingActivities
  } = useQuery<Activity[]>({
    queryKey: ["/api/activities", { limit: 5 }]
  });

  // Mutation to remove a device
  const removeDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      await apiRequest("DELETE", `/api/devices/${deviceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Device Removed",
        description: "The device has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDeviceToRemove(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove device: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Set up WebSocket connection
  useEffect(() => {
    if (user) {
      socketClient.connect();
      socketClient.authenticate(user.id);

      // Set up WebSocket event listeners
      const unsubStatus = socketClient.on("DEVICE_STATUS_CHANGED", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      });

      const unsubRemoved = socketClient.on("DEVICE_REMOVED", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      });

      const unsubActivity = socketClient.on("ACTIVITY_CREATED", () => {
        queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      });

      return () => {
        unsubStatus();
        unsubRemoved();
        unsubActivity();
      };
    }
  }, [user]);

  // Filter and paginate devices
  const filteredDevices = devices.filter(device => {
    // Apply search filter
    const matchesSearch = 
      searchQuery === "" || 
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.os.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter
    const matchesStatus = 
      (device.status === "online" && statusFilter.online) || 
      (device.status === "offline" && statusFilter.offline);
    
    // Apply platform filter
    const matchesPlatform = 
      (device.platform === "android" && platformFilter.android) ||
      (device.platform === "ios" && platformFilter.ios) ||
      (device.platform === "windows" && platformFilter.windows);
    
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle remove device confirmation
  const handleRemoveDevice = (device: Device) => {
    setDeviceToRemove(device);
  };

  // Handle pagination
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <DashboardLayout 
      title="Dashboard" 
      actions={
        <>
          <Button onClick={() => setIsAddDeviceOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={statusFilter.online}
                onCheckedChange={(checked) => 
                  setStatusFilter(prev => ({ ...prev, online: checked }))
                }
              >
                Online
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.offline}
                onCheckedChange={(checked) => 
                  setStatusFilter(prev => ({ ...prev, offline: checked }))
                }
              >
                Offline
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Platform</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={platformFilter.windows}
                onCheckedChange={(checked) => 
                  setpPlatformFilter(prev => ({ ...prev, windows: checked }))
                }
              >
                Windows
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={platformFilter.android}
                onCheckedChange={(checked) => 
                  setpPlatformFilter(prev => ({ ...prev, android: checked }))
                }
              >
                Android
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={platformFilter.ios}
                onCheckedChange={(checked) => 
                  setpPlatformFilter(prev => ({ ...prev, ios: checked }))
                }
              >
                iOS
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      {/* Stats Cards */}
      <StatsCard stats={stats || null} isLoading={isLoadingStats} />
      
      {/* Devices List */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-700">Managed Devices</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400"></i>
            </div>
            <Input 
              type="text"
              placeholder="Search devices..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoadingDevices ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : isDevicesError ? (
          <div className="bg-red-50 p-4 rounded-md text-red-600 text-center">
            Error loading devices: {devicesError?.message}
          </div>
        ) : paginatedDevices.length === 0 ? (
          <div className="bg-gray-50 p-6 rounded-md text-center">
            <p className="text-gray-500">No devices found. Add a device to get started.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setIsAddDeviceOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedDevices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onRemove={handleRemoveDevice}
                />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {paginatedDevices.length} of {filteredDevices.length} devices
                </p>
                <div className="flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="rounded-r-none"
                  >
                    <i className="fas fa-chevron-left"></i>
                  </Button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="rounded-none border-x-0"
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="rounded-l-none"
                  >
                    <i className="fas fa-chevron-right"></i>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Recent Activity */}
      <div className="mt-6">
        <ActivityList 
          activities={activities} 
          isLoading={isLoadingActivities}
          showViewAll={true}
        />
      </div>
      
      {/* Add Device Modal */}
      <AddDeviceModal 
        open={isAddDeviceOpen} 
        onOpenChange={setIsAddDeviceOpen} 
      />
      
      {/* Remove Device Confirmation */}
      <AlertDialog open={!!deviceToRemove} onOpenChange={() => setDeviceToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deviceToRemove?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deviceToRemove) {
                  removeDeviceMutation.mutate(deviceToRemove.id);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
