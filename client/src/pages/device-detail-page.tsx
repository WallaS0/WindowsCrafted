import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Device, Command, Activity } from "@shared/schema";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActivityList } from "@/components/dashboard/activity-list";
import { Loader2, ArrowLeft, RefreshCw, Edit, Trash } from "lucide-react";
import { socketClient } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const updateDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
});

type UpdateDeviceForm = z.infer<typeof updateDeviceSchema>;

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const deviceId = parseInt(params.id);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Fetch device details
  const {
    data: device,
    isLoading: isLoadingDevice,
    isError: isDeviceError,
    error: deviceError
  } = useQuery<Device>({
    queryKey: [`/api/devices/${deviceId}`],
  });

  // Fetch device activities
  const {
    data: activities = [],
    isLoading: isLoadingActivities
  } = useQuery<Activity[]>({
    queryKey: [`/api/activities`, { deviceId: device?.deviceId }],
    enabled: !!device?.deviceId
  });

  // Fetch device commands
  const {
    data: commands = [],
    isLoading: isLoadingCommands
  } = useQuery<Command[]>({
    queryKey: [`/api/commands`, { deviceId: device?.deviceId }],
    enabled: !!device?.deviceId
  });

  // Setup edit device form
  const form = useForm<UpdateDeviceForm>({
    resolver: zodResolver(updateDeviceSchema),
    defaultValues: {
      name: device?.name || "",
    },
  });

  useEffect(() => {
    if (device) {
      form.reset({ name: device.name });
    }
  }, [device, form]);

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async (data: UpdateDeviceForm) => {
      return apiRequest("PATCH", `/api/devices/${deviceId}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Device Updated",
        description: "Device information has been updated successfully.",
      });
      setShowEditDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove device mutation
  const removeDeviceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/devices/${deviceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Device Removed",
        description: "The device has been successfully removed.",
      });
      navigate("/devices");
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to remove device: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Setup WebSocket for real-time updates
  useEffect(() => {
    if (device?.deviceId) {
      const unsubStatus = socketClient.on("DEVICE_STATUS_CHANGED", (data) => {
        if (data.deviceId === device.deviceId) {
          queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}`] });
        }
      });

      const unsubActivity = socketClient.on("ACTIVITY_CREATED", () => {
        queryClient.invalidateQueries({ queryKey: [`/api/activities`, { deviceId: device.deviceId }] });
      });

      const unsubCommand = socketClient.on("COMMAND_STATUS_CHANGED", () => {
        queryClient.invalidateQueries({ queryKey: [`/api/commands`, { deviceId: device.deviceId }] });
      });

      return () => {
        unsubStatus();
        unsubActivity();
        unsubCommand();
      };
    }
  }, [device?.deviceId, deviceId]);

  // Format last active time
  const lastActiveTime = device?.lastActive 
    ? formatDistance(new Date(device.lastActive), new Date(), { addSuffix: true })
    : 'Unknown';
  
  // Display last active as "Now" if it's just now
  const displayLastActive = lastActiveTime === 'less than a minute ago' ? 'Now' : lastActiveTime;

  // Handle edit device form submission
  const onSubmit = (data: UpdateDeviceForm) => {
    updateDeviceMutation.mutate(data);
  };

  if (isLoadingDevice) {
    return (
      <DashboardLayout title="Device Details">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (isDeviceError || !device) {
    return (
      <DashboardLayout title="Device Details">
        <div className="bg-red-50 rounded-lg p-8 text-center">
          <h2 className="text-lg font-medium text-red-800 mb-2">Error Loading Device</h2>
          <p className="text-red-600">{deviceError?.message || "Device not found"}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate("/devices")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Devices
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Device: ${device.name}`}
      actions={
        <>
          <Button 
            variant="outline" 
            onClick={() => navigate("/devices")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="destructive"
            onClick={() => setShowRemoveDialog(true)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </>
      }
    >
      {/* Device Overview */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Device Information</CardTitle>
            <StatusBadge status={device.status as any} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Device ID</h3>
                <p className="mt-1">{device.deviceId}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Platform</h3>
                <p className="mt-1 capitalize">{device.platform}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">OS Version</h3>
                <p className="mt-1">{device.os}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">IP Address</h3>
                <p className="mt-1">{device.ipAddress || "Unknown"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">User</h3>
                <p className="mt-1">{device.user || "Unknown"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Active</h3>
                <p className="mt-1">{displayLastActive}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Registration Date</h3>
                <p className="mt-1">
                  {new Date(device.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Device System Information (if available) */}
          {device.info && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {device.info.manufacturer && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Manufacturer</h4>
                    <p className="mt-1">{device.info.manufacturer}</p>
                  </div>
                )}
                {device.info.model && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Model</h4>
                    <p className="mt-1">{device.info.model}</p>
                  </div>
                )}
                {device.info.serialNumber && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Serial Number</h4>
                    <p className="mt-1">{device.info.serialNumber}</p>
                  </div>
                )}
                {device.info.battery !== undefined && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Battery</h4>
                    <p className="mt-1">{device.info.battery}%</p>
                  </div>
                )}
                {device.info.storage && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Storage</h4>
                    <p className="mt-1">
                      {Math.round((device.info.storage.free / device.info.storage.total) * 100)}% free
                      ({Math.round(device.info.storage.free / (1024 * 1024 * 1024))} GB / 
                      {Math.round(device.info.storage.total / (1024 * 1024 * 1024))} GB)
                    </p>
                  </div>
                )}
                {device.info.memory && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Memory</h4>
                    <p className="mt-1">
                      {Math.round((device.info.memory.free / device.info.memory.total) * 100)}% free
                      ({Math.round(device.info.memory.free / (1024 * 1024))} MB / 
                      {Math.round(device.info.memory.total / (1024 * 1024))} MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Installed Apps (if available) */}
              {device.info.installedApps && device.info.installedApps.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Installed Applications</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Version
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Package Name
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {device.info.installedApps.slice(0, 5).map((app, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {app.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {app.version}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {app.packageName}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {device.info.installedApps.length > 5 && (
                      <div className="px-6 py-3 bg-gray-50 text-right">
                        <span className="text-sm text-gray-500">
                          Showing 5 of {device.info.installedApps.length} applications
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Activities and Commands */}
      <Tabs defaultValue="activities" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="activities">Recent Activities</TabsTrigger>
          <TabsTrigger value="commands">Command History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activities" className="mt-6">
          <ActivityList 
            activities={activities} 
            isLoading={isLoadingActivities}
            showViewAll={false}
          />
        </TabsContent>
        
        <TabsContent value="commands" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Command History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingCommands ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : commands.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No command history found for this device.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Command
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {commands.map((command) => (
                        <tr key={command.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {command.command}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={command.status as any} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(command.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {command.completedAt 
                              ? new Date(command.completedAt).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Remove Device Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {device.name}? This action cannot be undone
              and all data associated with this device will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeDeviceMutation.mutate()}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Device Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update the device information.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateDeviceMutation.isPending}
                >
                  {updateDeviceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save Changes</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
