import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Device } from "@shared/schema";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { socketClient } from "@/lib/socket";
import { 
  Loader2, 
  Folder, 
  File, 
  ArrowLeft, 
  Upload, 
  Download, 
  Trash,
  MoreHorizontal,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent 
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Mock file system structure
// In a real implementation, this would come from the device via API
interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

// Form schemas
const selectDeviceSchema = z.object({
  deviceId: z.string({ required_error: "Please select a device" }),
});

type SelectDeviceFormValues = z.infer<typeof selectDeviceSchema>;

const newFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required"),
});

type NewFolderFormValues = z.infer<typeof newFolderSchema>;

const uploadFileSchema = z.object({
  files: z.any().refine((files) => files?.length > 0, "Please select at least one file"),
});

type UploadFileFormValues = z.infer<typeof uploadFileSchema>;

export default function FileManagerPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Get deviceId from URL if present
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const urlDeviceId = urlParams.get("deviceId");
  
  const [selectedDevice, setSelectedDevice] = useState<string | null>(urlDeviceId);
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [isDeviceSelectOpen, setIsDeviceSelectOpen] = useState(!urlDeviceId);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileSystemItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Device select form
  const deviceForm = useForm<SelectDeviceFormValues>({
    resolver: zodResolver(selectDeviceSchema),
    defaultValues: {
      deviceId: urlDeviceId || "",
    }
  });
  
  // New folder form
  const folderForm = useForm<NewFolderFormValues>({
    resolver: zodResolver(newFolderSchema),
    defaultValues: {
      name: "",
    }
  });
  
  // Upload file form
  const uploadForm = useForm<UploadFileFormValues>({
    resolver: zodResolver(uploadFileSchema),
  });

  // Fetch devices
  const { 
    data: devices = [],
    isLoading: isLoadingDevices,
  } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });
  
  // Mock file system data - this would come from an API in a real implementation
  const [fileSystem, setFileSystem] = useState<FileSystemItem[]>([]);
  
  // This would be a real API call in a production environment
  useEffect(() => {
    if (selectedDevice) {
      setIsLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        // Generate mock file system based on current path
        // In a real implementation, this would be an API call to the device
        let mockFiles: FileSystemItem[] = [];
        
        if (currentPath === "/") {
          mockFiles = [
            { name: "Documents", path: "/Documents", type: "directory" },
            { name: "Downloads", path: "/Downloads", type: "directory" },
            { name: "Pictures", path: "/Pictures", type: "directory" },
            { name: "Videos", path: "/Videos", type: "directory" },
            { name: "system.log", path: "/system.log", type: "file", size: 1024 * 512, modified: "2023-10-25T14:48:00" },
            { name: "config.json", path: "/config.json", type: "file", size: 1024 * 2, modified: "2023-10-24T09:15:00" },
          ];
        } else if (currentPath === "/Documents") {
          mockFiles = [
            { name: "Work", path: "/Documents/Work", type: "directory" },
            { name: "Personal", path: "/Documents/Personal", type: "directory" },
            { name: "report.docx", path: "/Documents/report.docx", type: "file", size: 1024 * 1024 * 2.5, modified: "2023-10-20T16:30:00" },
            { name: "notes.txt", path: "/Documents/notes.txt", type: "file", size: 1024 * 10, modified: "2023-10-22T11:45:00" },
          ];
        } else if (currentPath === "/Pictures") {
          mockFiles = [
            { name: "Vacation", path: "/Pictures/Vacation", type: "directory" },
            { name: "Family", path: "/Pictures/Family", type: "directory" },
            { name: "wallpaper.jpg", path: "/Pictures/wallpaper.jpg", type: "file", size: 1024 * 1024 * 1.2, modified: "2023-09-15T08:20:00" },
            { name: "profile.png", path: "/Pictures/profile.png", type: "file", size: 1024 * 1024 * 0.8, modified: "2023-10-10T17:55:00" },
          ];
        } else if (currentPath === "/Downloads") {
          mockFiles = [
            { name: "software.exe", path: "/Downloads/software.exe", type: "file", size: 1024 * 1024 * 45, modified: "2023-10-18T14:30:00" },
            { name: "presentation.pptx", path: "/Downloads/presentation.pptx", type: "file", size: 1024 * 1024 * 6.7, modified: "2023-10-15T09:22:00" },
            { name: "data.zip", path: "/Downloads/data.zip", type: "file", size: 1024 * 1024 * 120, modified: "2023-10-05T16:10:00" },
          ];
        } else if (currentPath === "/Videos") {
          mockFiles = [
            { name: "tutorial.mp4", path: "/Videos/tutorial.mp4", type: "file", size: 1024 * 1024 * 250, modified: "2023-09-28T11:40:00" },
            { name: "meeting.mp4", path: "/Videos/meeting.mp4", type: "file", size: 1024 * 1024 * 180, modified: "2023-10-12T15:30:00" },
          ];
        } else {
          // Default empty directory
          mockFiles = [];
        }
        
        setFileSystem(mockFiles);
        setIsLoading(false);
      }, 800);
    }
  }, [selectedDevice, currentPath]);
  
  // Find device by ID
  const getDeviceById = (deviceId: string) => {
    return devices.find(device => device.deviceId === deviceId);
  };
  
  // Filter files by search query
  const filteredFiles = fileSystem.filter(item => 
    searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle device selection
  const onSelectDevice = (data: SelectDeviceFormValues) => {
    setSelectedDevice(data.deviceId);
    setCurrentPath("/");
    setIsDeviceSelectOpen(false);
    
    // In a real implementation, this would initiate a connection to the device
    toast({
      title: "Device Connected",
      description: `Connected to ${getDeviceById(data.deviceId)?.name || data.deviceId}`,
    });
  };
  
  // Handle directory navigation
  const navigateToDirectory = (path: string) => {
    setCurrentPath(path);
    setSearchQuery("");
  };
  
  // Handle parent directory navigation
  const navigateUp = () => {
    if (currentPath === "/") return;
    
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const parentPath = parts.length === 0 ? "/" : `/${parts.join("/")}`;
    setCurrentPath(parentPath);
    setSearchQuery("");
  };
  
  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      setCurrentPath("/");
      return;
    }
    
    const parts = currentPath.split("/").filter(Boolean);
    const newPath = "/" + parts.slice(0, index).join("/");
    setCurrentPath(newPath);
  };
  
  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined) return "Unknown";
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Create directory
  const handleCreateFolder = (data: NewFolderFormValues) => {
    // In a real implementation, this would call an API
    const newFolder: FileSystemItem = {
      name: data.name,
      path: `${currentPath === "/" ? "" : currentPath}/${data.name}`,
      type: "directory"
    };
    
    setFileSystem([...fileSystem, newFolder].sort((a, b) => 
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1
    ));
    
    setIsNewFolderOpen(false);
    folderForm.reset();
    
    toast({
      title: "Folder Created",
      description: `Created folder: ${data.name}`,
    });
  };
  
  // Upload file
  const handleUploadFile = (data: UploadFileFormValues) => {
    // In a real implementation, this would call an API to upload files
    const files = data.files as FileList;
    const uploadedFiles: FileSystemItem[] = [];
    
    Array.from(files).forEach(file => {
      uploadedFiles.push({
        name: file.name,
        path: `${currentPath === "/" ? "" : currentPath}/${file.name}`,
        type: "file",
        size: file.size,
        modified: new Date().toISOString()
      });
    });
    
    setFileSystem([...fileSystem, ...uploadedFiles].sort((a, b) => 
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1
    ));
    
    setIsUploadOpen(false);
    uploadForm.reset();
    
    toast({
      title: "Files Uploaded",
      description: `Uploaded ${uploadedFiles.length} file(s)`,
    });
  };
  
  // Delete file or folder
  const handleDelete = () => {
    if (!fileToDelete) return;
    
    // In a real implementation, this would call an API
    setFileSystem(fileSystem.filter(item => item.path !== fileToDelete.path));
    
    toast({
      title: fileToDelete.type === "directory" ? "Folder Deleted" : "File Deleted",
      description: `Deleted: ${fileToDelete.name}`,
    });
    
    setFileToDelete(null);
  };
  
  // Download file
  const handleDownload = (file: FileSystemItem) => {
    // In a real implementation, this would call an API to download the file
    toast({
      title: "Download Started",
      description: `Downloading: ${file.name}`,
    });
  };
  
  // Refresh current directory
  const handleRefresh = () => {
    setIsLoading(true);
    
    // In a real implementation, this would re-fetch the directory contents
    setTimeout(() => {
      toast({
        title: "Refreshed",
        description: "Directory contents updated",
      });
      setIsLoading(false);
    }, 800);
  };

  // Generate breadcrumbs
  const renderBreadcrumbs = () => {
    const parts = currentPath.split("/").filter(Boolean);
    
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => handleBreadcrumbClick(0)}>
              <Folder className="h-4 w-4 mr-1" />
              Root
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {parts.map((part, index) => (
            <React.Fragment key={index}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => handleBreadcrumbClick(index + 1)}>
                  {part}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  return (
    <DashboardLayout
      title="File Manager"
      actions={
        selectedDevice ? (
          <>
            <Button 
              variant="outline" 
              onClick={() => setIsDeviceSelectOpen(true)}
            >
              {getDeviceById(selectedDevice)?.name || selectedDevice}
            </Button>
            <Button
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsDeviceSelectOpen(true)}>
            Select Device
          </Button>
        )
      }
    >
      {selectedDevice ? (
        <>
          <div className="flex flex-col space-y-4">
            {/* Navigation bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigateUp}
                  disabled={currentPath === "/"}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 overflow-x-auto py-1 px-2">
                  {renderBreadcrumbs()}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsNewFolderOpen(true)}
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      New Folder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsUploadOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* File list */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    {searchQuery ? (
                      <>
                        <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No files matching "{searchQuery}"</p>
                      </>
                    ) : (
                      <>
                        <Folder className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>This folder is empty</p>
                        <div className="flex justify-center mt-4 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsNewFolderOpen(true)}
                          >
                            <FolderPlus className="h-4 w-4 mr-2" />
                            New Folder
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsUploadOpen(true)}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    <div className="grid grid-cols-12 p-3 bg-gray-50 text-sm font-medium text-gray-500">
                      <div className="col-span-6 sm:col-span-7">Name</div>
                      <div className="col-span-3 sm:col-span-2">Size</div>
                      <div className="col-span-3 hidden sm:block">Modified</div>
                    </div>
                    
                    {filteredFiles.map((item, index) => (
                      <div 
                        key={index} 
                        className="grid grid-cols-12 p-3 hover:bg-gray-50 text-sm items-center"
                      >
                        <div className="col-span-6 sm:col-span-7 flex items-center">
                          {item.type === "directory" ? (
                            <Folder className="h-5 w-5 mr-2 text-blue-500" />
                          ) : (
                            <File className="h-5 w-5 mr-2 text-gray-500" />
                          )}
                          
                          {item.type === "directory" ? (
                            <button 
                              className="hover:underline text-blue-600 truncate"
                              onClick={() => navigateToDirectory(item.path)}
                            >
                              {item.name}
                            </button>
                          ) : (
                            <span className="truncate">{item.name}</span>
                          )}
                        </div>
                        
                        <div className="col-span-3 sm:col-span-2 text-gray-500">
                          {item.type === "directory" ? "--" : formatFileSize(item.size)}
                        </div>
                        
                        <div className="col-span-3 hidden sm:block text-gray-500">
                          {item.modified 
                            ? new Date(item.modified).toLocaleDateString() 
                            : "--"}
                        </div>
                        
                        <div className="col-span-3 sm:col-span-1 flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.type === "file" && (
                                <DropdownMenuItem
                                  onClick={() => handleDownload(item)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setFileToDelete(item)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-[50vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Folder className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h2 className="text-2xl font-bold">File Manager</h2>
                <p className="text-gray-500 mt-2">
                  Please select a device to manage files
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setIsDeviceSelectOpen(true)}
              >
                Select Device
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Device Selection Dialog */}
      <Dialog open={isDeviceSelectOpen} onOpenChange={setIsDeviceSelectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Device</DialogTitle>
            <DialogDescription>
              Choose a device to browse and manage files.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...deviceForm}>
            <form onSubmit={deviceForm.handleSubmit(onSelectDevice)} className="space-y-6">
              <FormField
                control={deviceForm.control}
                name="deviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device</FormLabel>
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
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDeviceSelectOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Connect
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* New Folder Dialog */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...folderForm}>
            <form onSubmit={folderForm.handleSubmit(handleCreateFolder)} className="space-y-6">
              <FormField
                control={folderForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Folder Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewFolderOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Upload Files Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload to the current directory.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...uploadForm}>
            <form onSubmit={uploadForm.handleSubmit(handleUploadFile)} className="space-y-6">
              <FormField
                control={uploadForm.control}
                name="files"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Select Files</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="file" 
                        multiple
                        onChange={(e) => onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsUploadOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Upload
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {fileToDelete?.type === "directory" ? "Folder" : "File"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {fileToDelete?.name}? This action cannot be undone.
              {fileToDelete?.type === "directory" && (
                <p className="mt-2 text-red-600 font-medium">
                  This will also delete all files and folders inside this directory.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
