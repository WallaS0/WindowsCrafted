import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Command, Device } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { socketClient } from "@/lib/socket";
import { Loader2, Plus, ArrowRight, Filter, Terminal } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Pre-defined commands
const COMMAND_TEMPLATES = {
  // System Information Commands
  "getProcesses": {
    label: "Get Running Processes",
    command: "getProcesses",
    parameters: { sortBy: "cpu" },
    description: "Lists all currently running processes on the device, sorted by CPU usage."
  },
  "getSystemInfo": {
    label: "Get System Information",
    command: "getSystemInfo",
    parameters: { detailed: true },
    description: "Retrieves detailed system information from the device."
  },
  "getHardwareInfo": {
    label: "Get Hardware Details",
    command: "getHardwareInfo",
    parameters: {},
    description: "Retrieves detailed hardware information including CPU, memory, disk, and peripherals."
  },
  "getNetworkInfo": {
    label: "Get Network Status",
    command: "getNetworkInfo",
    parameters: { includeHistory: true },
    description: "Retrieves detailed network status including connectivity, IP configurations, and network interfaces."
  },
  "getBatteryStatus": {
    label: "Get Battery Status",
    command: "getBatteryStatus",
    parameters: {},
    description: "Gets the current battery status, health, and remaining time."
  },
  "getDiskSpace": {
    label: "Check Disk Space",
    command: "getDiskSpace",
    parameters: { allVolumes: true },
    description: "Retrieves available space on all storage volumes."
  },

  // Remote Control Commands
  "takeScreenshot": {
    label: "Take Screenshot",
    command: "takeScreenshot",
    parameters: { quality: "high" },
    description: "Captures the current screen of the device in high quality."
  },
  "startRemoteControl": {
    label: "Start Remote Control Session",
    command: "startRemoteControl",
    parameters: { quality: "auto", fps: 30 },
    description: "Initiates a full remote control session with mouse and keyboard input."
  },
  "lockScreen": {
    label: "Lock Screen",
    command: "lockScreen",
    parameters: {},
    description: "Locks the device screen immediately."
  },
  "sendKeystrokes": {
    label: "Send Keystrokes",
    command: "sendKeystrokes",
    parameters: { keys: "" },
    description: "Send specific keystrokes to the device."
  },
  
  // Application Management
  "installApp": {
    label: "Install Application",
    command: "installApp",
    parameters: { packageUrl: "", silentInstall: true },
    description: "Installs an application from the specified URL silently."
  },
  "uninstallApp": {
    label: "Uninstall Application",
    command: "uninstallApp",
    parameters: { packageName: "", keepData: false },
    description: "Uninstalls the application with the specified package name."
  },
  "startApp": {
    label: "Start Application",
    command: "startApp",
    parameters: { packageName: "", args: "" },
    description: "Launches an application with optional arguments."
  },
  "killApp": {
    label: "Force Close Application",
    command: "killApp",
    parameters: { packageName: "" },
    description: "Force closes a running application."
  },
  "listInstalledApps": {
    label: "List Installed Applications",
    command: "listInstalledApps",
    parameters: { includeSystemApps: false },
    description: "Lists all user-installed applications on the device."
  },
  
  // File System Commands
  "listFiles": {
    label: "List Files",
    command: "listFiles",
    parameters: { path: "/", recursive: false, showHidden: false },
    description: "Lists files in the specified directory."
  },
  "downloadFile": {
    label: "Download File",
    command: "downloadFile",
    parameters: { remotePath: "" },
    description: "Downloads a file from the device to the admin dashboard."
  },
  "uploadFile": {
    label: "Upload File",
    command: "uploadFile",
    parameters: { localFile: null, remotePath: "" },
    description: "Uploads a file from the admin dashboard to the device."
  },
  "deleteFile": {
    label: "Delete File",
    command: "deleteFile",
    parameters: { path: "", secure: false },
    description: "Deletes a file or directory on the device."
  },
  "searchFiles": {
    label: "Search Files",
    command: "searchFiles",
    parameters: { query: "", path: "/", caseSensitive: false },
    description: "Searches for files matching the query on the device."
  },
  
  // System Administration
  "restartDevice": {
    label: "Restart Device",
    command: "restartDevice",
    parameters: { delay: 0, force: false },
    description: "Restarts the device, optionally with delay in seconds."
  },
  "shutdownDevice": {
    label: "Shutdown Device",
    command: "shutdownDevice",
    parameters: { delay: 0 },
    description: "Shuts down the device, optionally with delay in seconds."
  },
  "enableFirewall": {
    label: "Enable Firewall",
    command: "enableFirewall",
    parameters: { profile: "standard" },
    description: "Enables the device firewall with specified security profile."
  },
  "runAntivirus": {
    label: "Run Antivirus Scan",
    command: "runAntivirus",
    parameters: { scanType: "quick" },
    description: "Runs an antivirus scan on the device with specified scan type (quick/full)."
  },
  
  // Network Commands
  "pingHost": {
    label: "Ping Host",
    command: "pingHost",
    parameters: { host: "", count: 4 },
    description: "Pings a host and returns the results."
  },
  "traceroute": {
    label: "Trace Route",
    command: "traceroute",
    parameters: { host: "" },
    description: "Performs a traceroute to the specified host."
  },
  "checkPort": {
    label: "Check Port",
    command: "checkPort",
    parameters: { host: "", port: 80 },
    description: "Checks if a specific port is open on a host."
  },
  
  // Advanced Commands
  "executeShell": {
    label: "Execute Shell Command",
    command: "executeShell",
    parameters: { command: "", runAsAdmin: false },
    description: "Executes a shell command on the device. Use with caution."
  },
  "scheduleTask": {
    label: "Schedule Task",
    command: "scheduleTask",
    parameters: { command: "", schedule: "once", time: "" },
    description: "Schedules a command to run at a specific time."
  },
  "captureWebcam": {
    label: "Capture Webcam",
    command: "captureWebcam",
    parameters: { device: 0, quality: "high" },
    description: "Captures an image from the device's webcam."
  },
  "recordAudio": {
    label: "Record Audio",
    command: "recordAudio",
    parameters: { duration: 10, device: "default" },
    description: "Records audio from the device's microphone for specified duration in seconds."
  },
  "getGeoLocation": {
    label: "Get Geolocation",
    command: "getGeoLocation",
    parameters: { accuracy: "high" },
    description: "Retrieves the current geographic location of the device."
  }
};

// Command form schema
const commandFormSchema = z.object({
  deviceId: z.string({ required_error: "Please select a device" }),
  command: z.string({ required_error: "Please enter a command" }),
  parameters: z.record(z.any()).optional(),
  parametersString: z.string().optional(),
});

type CommandFormValues = z.infer<typeof commandFormSchema>;

// Filter schema
const filterSchema = z.object({
  deviceId: z.string().optional(),
  status: z.enum(["all", "pending", "completed", "failed"]).default("all"),
});

type FilterValues = z.infer<typeof filterSchema>;

export default function CommandsPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [isNewCommandOpen, setIsNewCommandOpen] = useState(false);
  const [commandDetailsOpen, setCommandDetailsOpen] = useState<number | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [filter, setFilter] = useState<FilterValues>({
    deviceId: new URLSearchParams(location.split("?")[1] || "").get("deviceId") || undefined,
    status: "all"
  });

  // Form for new command
  const form = useForm<CommandFormValues>({
    resolver: zodResolver(commandFormSchema),
    defaultValues: {
      deviceId: filter.deviceId || "",
      command: "",
      parameters: {},
      parametersString: "{}"
    }
  });

  // Fetch devices
  const { 
    data: devices = [],
    isLoading: isLoadingDevices
  } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Fetch commands with filter
  const { 
    data: commands = [],
    isLoading: isLoadingCommands,
    refetch: refetchCommands
  } = useQuery<Command[]>({
    queryKey: ["/api/commands", filter],
    queryFn: async ({ queryKey }) => {
      const [_, filterParams] = queryKey as [string, FilterValues];
      const params = new URLSearchParams();
      if (filterParams.deviceId) {
        params.append("deviceId", filterParams.deviceId);
      }
      
      const res = await fetch(`/api/commands?${params.toString()}`, {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Failed to fetch commands");
      }
      
      const data = await res.json() as Command[];
      
      // Apply status filter client-side
      if (filterParams.status !== "all") {
        return data.filter((cmd) => cmd.status === filterParams.status);
      }
      
      return data;
    }
  });

  // Create command mutation
  const createCommandMutation = useMutation({
    mutationFn: async (data: CommandFormValues) => {
      // Parse parameters if provided as a string
      let parameters = data.parameters;
      if (data.parametersString) {
        try {
          parameters = JSON.parse(data.parametersString);
        } catch (error) {
          throw new Error("Invalid parameters JSON format");
        }
      }
      
      const payload = {
        deviceId: data.deviceId,
        command: data.command,
        parameters
      };
      
      const res = await apiRequest("POST", "/api/commands", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Command Created",
        description: "The command has been sent to the device."
      });
      setIsNewCommandOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Set up WebSocket for real-time updates
  useEffect(() => {
    const unsubCommand = socketClient.on("COMMAND_STATUS_CHANGED", () => {
      refetchCommands();
    });
    
    return () => {
      unsubCommand();
    };
  }, [refetchCommands]);

  // Handle command template selection
  const handleCommandTemplateSelect = (templateKey: string) => {
    const template = COMMAND_TEMPLATES[templateKey as keyof typeof COMMAND_TEMPLATES];
    
    form.setValue("command", template.command);
    form.setValue("parameters", template.parameters);
    form.setValue("parametersString", JSON.stringify(template.parameters, null, 2));
  };

  // Handle command form submission
  const onSubmit = (data: CommandFormValues) => {
    createCommandMutation.mutate(data);
  };

  // Find device by ID
  const getDeviceById = (deviceId: string) => {
    return devices.find(device => device.deviceId === deviceId);
  };

  // Get device name for display
  const getDeviceName = (deviceId: string) => {
    const device = getDeviceById(deviceId);
    return device ? device.name : deviceId;
  };

  // Handle command details view
  const handleViewCommandDetails = (command: Command) => {
    setSelectedCommand(command);
    setCommandDetailsOpen(command.id);
  };

  // Handle filter changes
  const handleDeviceFilterChange = (deviceId: string | undefined) => {
    setFilter(prev => ({ ...prev, deviceId }));
  };

  const handleStatusFilterChange = (status: FilterValues["status"]) => {
    setFilter(prev => ({ ...prev, status }));
  };

  // Reset form when opening new command dialog
  useEffect(() => {
    if (isNewCommandOpen) {
      form.reset({
        deviceId: filter.deviceId || "",
        command: "",
        parameters: {},
        parametersString: "{}"
      });
    }
  }, [isNewCommandOpen, form, filter.deviceId]);

  return (
    <DashboardLayout
      title="Commands"
      actions={
        <>
          <Button onClick={() => setIsNewCommandOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Command
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Filter Commands</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                  By Device
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleDeviceFilterChange(undefined)}
                  className={!filter.deviceId ? "bg-gray-100" : ""}
                >
                  All Devices
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {isLoadingDevices ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : (
                  devices.map(device => (
                    <DropdownMenuItem 
                      key={device.deviceId}
                      onClick={() => handleDeviceFilterChange(device.deviceId)}
                      className={filter.deviceId === device.deviceId ? "bg-gray-100" : ""}
                    >
                      {device.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                  By Status
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => handleStatusFilterChange("all")}
                  className={filter.status === "all" ? "bg-gray-100" : ""}
                >
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleStatusFilterChange("pending")}
                  className={filter.status === "pending" ? "bg-gray-100" : ""}
                >
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleStatusFilterChange("completed")}
                  className={filter.status === "completed" ? "bg-gray-100" : ""}
                >
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleStatusFilterChange("failed")}
                  className={filter.status === "failed" ? "bg-gray-100" : ""}
                >
                  Failed
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      {/* Filter status indicator */}
      {(filter.deviceId || filter.status !== "all") && (
        <div className="mb-6 flex flex-wrap items-center gap-2 bg-gray-50 p-4 rounded-md">
          <span className="text-sm text-gray-500">Filters:</span>
          {filter.deviceId && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
              <span>Device: {getDeviceName(filter.deviceId)}</span>
              <button 
                onClick={() => handleDeviceFilterChange(undefined)}
                className="text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
            </div>
          )}
          {filter.status !== "all" && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
              <span>Status: {filter.status.charAt(0).toUpperCase() + filter.status.slice(1)}</span>
              <button 
                onClick={() => handleStatusFilterChange("all")}
                className="text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
            </div>
          )}
          <Button 
            variant="link" 
            className="text-sm p-0 h-auto"
            onClick={() => setFilter({ deviceId: undefined, status: "all" })}
          >
            Clear All
          </Button>
        </div>
      )}
      
      {/* Commands List */}
      {isLoadingCommands ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : commands.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-md text-center">
          <Terminal className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">No commands found.</p>
          <Button onClick={() => setIsNewCommandOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Command
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commands.map(command => (
            <Card key={command.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base truncate">
                    {command.command}
                  </CardTitle>
                  <StatusBadge status={command.status as any} />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-sm text-gray-500 mb-2">
                  <span className="font-medium">Device:</span> {getDeviceName(command.deviceId)}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  <span className="font-medium">Created:</span> {new Date(command.createdAt).toLocaleString()}
                </div>
                {command.completedAt && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Completed:</span> {new Date(command.completedAt).toLocaleString()}
                  </div>
                )}
                {command.parameters && typeof command.parameters === 'object' && Object.keys(command.parameters as object).length > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 rounded-md text-xs font-mono overflow-x-auto">
                    <pre>{JSON.stringify(command.parameters, null, 2)}</pre>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => handleViewCommandDetails(command)}
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* New Command Dialog */}
      <Dialog open={isNewCommandOpen} onOpenChange={setIsNewCommandOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create New Command</DialogTitle>
            <DialogDescription>
              Send a command to a device. You can select from predefined commands or create a custom one.
            </DialogDescription>
          </DialogHeader>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start mt-2">
                <Terminal className="mr-2 h-4 w-4" />
                <span>{form.watch("command") ? "Selected: " + form.watch("command") : "Select Command Template"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuLabel>Command Templates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(COMMAND_TEMPLATES).map(([key, template]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleCommandTemplateSelect(key)}
                >
                  <div>
                    <div className="font-medium">{template.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              <FormField
                control={form.control}
                name="deviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Device</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a device" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingDevices ? (
                          <div className="flex justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : devices.length === 0 ? (
                          <div className="p-2 text-center text-sm text-gray-500">
                            No devices available
                          </div>
                        ) : (
                          devices.map(device => (
                            <SelectItem 
                              key={device.deviceId} 
                              value={device.deviceId}
                              disabled={device.status !== "online"}
                            >
                              {device.name} {device.status !== "online" && "(Offline)"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="command"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Command</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter command" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parametersString"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parameters (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="{}" 
                        className="font-mono text-sm h-32"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter command parameters in JSON format.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewCommandOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCommandMutation.isPending}
                >
                  {createCommandMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>Send Command</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Command Details Dialog */}
      <Dialog open={!!commandDetailsOpen} onOpenChange={() => setCommandDetailsOpen(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Command Details</DialogTitle>
          </DialogHeader>
          
          {selectedCommand && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Status</h3>
                <StatusBadge status={selectedCommand.status as any} />
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Command</h3>
                <div className="p-3 bg-gray-50 rounded-md font-mono text-sm">
                  {selectedCommand.command}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Device</h3>
                <p>{getDeviceName(selectedCommand.deviceId)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Created</h3>
                  <p>{new Date(selectedCommand.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Completed</h3>
                  <p>{selectedCommand.completedAt 
                    ? new Date(selectedCommand.completedAt).toLocaleString() 
                    : "Not completed"}
                  </p>
                </div>
              </div>
              
              {selectedCommand.parameters && typeof selectedCommand.parameters === 'object' && Object.keys(selectedCommand.parameters as object).length > 0 && (
                <div>
                  <h3 className="font-medium mb-1">Parameters</h3>
                  <div className="p-3 bg-gray-50 rounded-md font-mono text-sm overflow-x-auto">
                    <pre>{JSON.stringify(selectedCommand.parameters, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {selectedCommand.result && (
                <div>
                  <h3 className="font-medium mb-1">Result</h3>
                  <div className="p-3 bg-gray-50 rounded-md font-mono text-sm max-h-[200px] overflow-auto">
                    <pre>{selectedCommand.result}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => setCommandDetailsOpen(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
