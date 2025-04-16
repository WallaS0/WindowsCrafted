import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDeviceModal({ open, onOpenChange }: AddDeviceModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("register");

  // Query to fetch registration code
  const {
    data: registrationData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["/api/registration-code"],
    queryFn: async () => {
      if (!open) return null; // Only fetch when modal is open
      const res = await apiRequest("POST", "/api/registration-code", {});
      return await res.json();
    },
    enabled: open && activeTab === "register",
  });

  // Mutation to generate a new code
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/registration-code", {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/registration-code"], data);
      toast({
        title: "New Code Generated",
        description: "A new registration code has been generated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Generating Code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format expiry time
  const expiryTime = registrationData?.expiresAt
    ? new Date(registrationData.expiresAt).toLocaleString()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
          <DialogDescription>
            Connect a new device to your remote control dashboard.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="register" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register">Registration Code</TabsTrigger>
            <TabsTrigger value="download">Download App</TabsTrigger>
          </TabsList>
          
          <TabsContent value="register" className="py-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-4">
                Generate a unique registration code to connect a new device to your dashboard.
              </p>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : isError ? (
                <div className="p-4 bg-red-50 rounded-md border border-red-200 text-center">
                  <p className="text-red-600">Failed to generate code: {error?.message}</p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200 text-center">
                  <p className="text-xl font-mono font-bold text-gray-700">
                    {registrationData?.code}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    This code will expire on {expiryTime}
                  </p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Device Setup Instructions</p>
              <ol className="text-sm text-gray-600 list-decimal list-inside space-y-2">
                <li>Download the RemoteControl client app for your device platform</li>
                <li>Install and launch the application</li>
                <li>When prompted, enter the registration code shown above</li>
                <li>Approve the requested permissions on your device</li>
                <li>The device will appear in your dashboard once connected</li>
              </ol>
            </div>
          </TabsContent>
          
          <TabsContent value="download" className="py-4">
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-4">
                Download the RemoteControl client application for your device platform.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <a 
                  href="#" 
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    toast({
                      title: "Download Started",
                      description: "Windows client download initiated."
                    });
                  }}
                >
                  <i className="fab fa-windows text-2xl mb-2 text-blue-600"></i>
                  <span className="text-sm font-medium">Windows</span>
                </a>
                
                <a 
                  href="#" 
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    toast({
                      title: "Download Started",
                      description: "Android client download initiated."
                    });
                  }}
                >
                  <i className="fab fa-android text-2xl mb-2 text-green-600"></i>
                  <span className="text-sm font-medium">Android</span>
                </a>
                
                <a 
                  href="#" 
                  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    toast({
                      title: "Download Started",
                      description: "iOS client download initiated."
                    });
                  }}
                >
                  <i className="fab fa-apple text-2xl mb-2 text-gray-800"></i>
                  <span className="text-sm font-medium">iOS</span>
                </a>
              </div>
              
              <p className="text-xs text-gray-500 mt-4">
                Note: To connect the device after installation, you'll need a registration code.
                Switch to the Registration Code tab to generate one.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {activeTab === "register" && (
            <Button 
              onClick={() => generateCodeMutation.mutate()}
              disabled={generateCodeMutation.isPending}
            >
              {generateCodeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Generate New Code
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
