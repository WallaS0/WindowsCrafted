import React, { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Device } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { socketClient } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { Loader2, Monitor, Mouse, Eye, Keyboard, Camera, Mic, PhoneOff, Volume2, Power, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Types for remote control
interface StreamSettings {
  quality: "low" | "medium" | "high" | "ultra";
  fps: number;
  scale: number;
  audio: boolean;
  inputControl: boolean;
}

interface RemoteSession {
  deviceId: string;
  sessionId: string;
  startTime: number;
  streamSettings: StreamSettings;
}

export default function RemoteControlPage() {
  const [_, navigate] = useLocation();
  const params = useParams();
  const deviceId = params?.deviceId;
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(deviceId || null);
  const [confirmEndSession, setConfirmEndSession] = useState(false);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [keyboardText, setKeyboardText] = useState("");
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    quality: "medium",
    fps: 15,
    scale: 0.8,
    audio: false,
    inputControl: true
  });
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [currentFps, setCurrentFps] = useState(0);
  
  // Fetch available devices
  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  // Get online devices
  const onlineDevices = devices.filter(device => device.status === "online");
  
  // Selected device details
  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);

  // Start remote session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await apiRequest("POST", `/api/remote-session/start`, { 
        deviceId,
        settings: streamSettings
      });
      return response.json();
    },
    onSuccess: (data: { sessionId: string }) => {
      toast({
        title: "Remote session started",
        description: "You are now connected to the device."
      });
      
      setSession({
        deviceId: selectedDeviceId!,
        sessionId: data.sessionId,
        startTime: Date.now(),
        streamSettings
      });
      
      setIsConnected(true);
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start remote session",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  });

  // End remote session mutation
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      
      const response = await apiRequest("POST", `/api/remote-session/end`, { 
        sessionId: session.sessionId 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Remote session ended",
        description: "You have disconnected from the device."
      });
      
      setSession(null);
      setIsConnected(false);
      setConfirmEndSession(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to end remote session",
        description: error.message,
        variant: "destructive"
      });
      setConfirmEndSession(false);
    }
  });

  // Update stream settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: StreamSettings) => {
      if (!session) return;
      
      const response = await apiRequest("POST", `/api/remote-session/update-settings`, { 
        sessionId: session.sessionId,
        settings
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Stream settings have been updated."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send key command
  const sendKeysMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!session) return;
      
      const response = await apiRequest("POST", `/api/remote-session/send-keys`, { 
        sessionId: session.sessionId,
        text
      });
      return response.json();
    },
    onSuccess: () => {
      setKeyboardText("");
      setShowKeyboardInput(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send keyboard input",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle starting remote session
  const handleStartSession = () => {
    if (!selectedDeviceId) {
      toast({
        title: "Device required",
        description: "Please select a device to connect to.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    startSessionMutation.mutate(selectedDeviceId);
  };

  // Handle ending remote session
  const handleEndSession = () => {
    setConfirmEndSession(true);
  };

  // Handle updates to stream settings
  const handleUpdateSettings = (newSettings: Partial<StreamSettings>) => {
    const updatedSettings = { ...streamSettings, ...newSettings };
    setStreamSettings(updatedSettings);
    
    if (session) {
      updateSettingsMutation.mutate(updatedSettings);
    }
  };

  // Handle keyboard input
  const handleSendKeys = () => {
    if (keyboardText.trim()) {
      sendKeysMutation.mutate(keyboardText);
    }
  };

  // Handle mouse click on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!session || !streamSettings.inputControl || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate relative position based on canvas size vs actual content size
    const x = (e.clientX - rect.left) / (rect.width * streamSettings.scale);
    const y = (e.clientY - rect.top) / (rect.height * streamSettings.scale);
    
    socketClient.send({
      type: "REMOTE_MOUSE_CLICK",
      x,
      y,
      sessionId: session.sessionId
    });
  };

  // Set up WebSocket handling
  useEffect(() => {
    const handleFrameData = (data: any) => {
      if (!canvasRef.current || !data.imageData) return;
        
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Create image from received data
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Track frame rate
        setFrameCount(prev => prev + 1);
        setLastUpdateTime(Date.now());
      };
      img.src = data.imageData;
    };
    
    // Set up socket listeners
    const unsubFrame = socketClient.on("REMOTE_FRAME", handleFrameData);
    const unsubDisconnect = socketClient.on("REMOTE_DISCONNECTED", () => {
      setIsConnected(false);
      setSession(null);
      toast({
        title: "Remote session ended",
        description: "The device has disconnected.",
        variant: "destructive"
      });
    });
    
    return () => {
      unsubFrame();
      unsubDisconnect();
    };
  }, [toast]);
  
  // Calculate and update FPS counter
  useEffect(() => {
    const fpsInterval = setInterval(() => {
      if (lastUpdateTime && frameCount > 0) {
        const now = Date.now();
        const elapsed = now - lastUpdateTime;
        if (elapsed > 1000) {
          setCurrentFps(Math.round((frameCount / elapsed) * 1000));
          setFrameCount(0);
          setLastUpdateTime(now);
        }
      }
    }, 1000);
    
    return () => clearInterval(fpsInterval);
  }, [lastUpdateTime, frameCount]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (session) {
        endSessionMutation.mutate();
      }
    };
  }, [session]);
  
  // Format session duration
  const getSessionDuration = () => {
    if (!session) return "00:00:00";
    
    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    const hours = Math.floor(duration / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((duration % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(duration % 60).toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };
  
  return (
    <DashboardLayout 
      title="Remote Control" 
      actions={
        isConnected ? (
          <>
            <Badge variant="outline" className="mr-2 py-1 px-3">
              {getSessionDuration()}
            </Badge>
            <Badge variant="outline" className="mr-2 py-1 px-3">
              FPS: {currentFps}
            </Badge>
            <Button 
              variant="destructive" 
              onClick={handleEndSession}
              disabled={endSessionMutation.isPending}
            >
              {endSessionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PhoneOff className="mr-2 h-4 w-4" />
              )}
              End Session
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleStartSession} 
            disabled={isLoading || !selectedDeviceId || startSessionMutation.isPending}
          >
            {startSessionMutation.isPending || isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Start Remote Session
          </Button>
        )
      }
    >
      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Remote view area - takes 3/4 of width on large screens */}
          <div className="lg:col-span-3 rounded-md overflow-hidden bg-gray-100 border">
            <div className="relative w-full h-full min-h-[500px] flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                width={1280} 
                height={720} 
                className="max-w-full max-h-full object-contain"
                onClick={handleCanvasClick}
                style={{ cursor: streamSettings.inputControl ? 'crosshair' : 'default' }}
              />
              {!isConnected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white">
                  <div className="text-center">
                    <Monitor className="mx-auto mb-4 h-16 w-16" />
                    <h3 className="text-xl font-medium">Not Connected</h3>
                    <p className="mt-2">Select a device and start a remote session</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Controls area - takes 1/4 of width on large screens */}
          <div className="lg:col-span-1">
            <Tabs defaultValue="controls">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="controls" className="flex-1">Controls</TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
              </TabsList>
              
              {/* Control Panel */}
              <TabsContent value="controls" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-medium text-sm">Input Controls</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-auto py-3 flex flex-col items-center"
                        disabled={!isConnected || !streamSettings.inputControl}
                        onClick={() => setShowKeyboardInput(true)}
                      >
                        <Keyboard className="h-5 w-5 mb-1" />
                        <span className="text-xs">Keyboard</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-auto py-3 flex flex-col items-center"
                        disabled={!isConnected}
                        onClick={() => handleUpdateSettings({ inputControl: !streamSettings.inputControl })}
                      >
                        <Mouse className="h-5 w-5 mb-1" />
                        <span className="text-xs">Mouse {streamSettings.inputControl ? '(On)' : '(Off)'}</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-auto py-3 flex flex-col items-center"
                        disabled={!isConnected}
                      >
                        <Camera className="h-5 w-5 mb-1" />
                        <span className="text-xs">Webcam</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-auto py-3 flex flex-col items-center"
                        disabled={!isConnected}
                        onClick={() => handleUpdateSettings({ audio: !streamSettings.audio })}
                      >
                        {streamSettings.audio ? (
                          <Volume2 className="h-5 w-5 mb-1" />
                        ) : (
                          <Mic className="h-5 w-5 mb-1" />
                        )}
                        <span className="text-xs">Audio {streamSettings.audio ? '(On)' : '(Off)'}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium text-sm mb-3">System Controls</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-auto py-3 flex flex-col items-center text-amber-600"
                        disabled={!isConnected}
                      >
                        <Power className="h-5 w-5 mb-1" />
                        <span className="text-xs">Restart</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-auto py-3 flex flex-col items-center text-red-600"
                        disabled={!isConnected}
                      >
                        <Power className="h-5 w-5 mb-1" />
                        <span className="text-xs">Shutdown</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Settings Panel */}
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-medium text-sm">Stream Quality</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {(['low', 'medium', 'high', 'ultra'] as const).map(quality => (
                        <Button 
                          key={quality}
                          variant={streamSettings.quality === quality ? "default" : "outline"}
                          className="h-auto py-2"
                          onClick={() => handleUpdateSettings({ quality })}
                          disabled={!isConnected}
                        >
                          {quality.charAt(0).toUpperCase() + quality.slice(1)}
                        </Button>
                      ))}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="fps">Frame Rate (FPS)</Label>
                          <span className="text-gray-500 text-sm">{streamSettings.fps}</span>
                        </div>
                        <Slider 
                          id="fps"
                          disabled={!isConnected}
                          min={5}
                          max={60}
                          step={5}
                          value={[streamSettings.fps]}
                          onValueChange={(value) => handleUpdateSettings({ fps: value[0] })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="scale">Scale</Label>
                          <span className="text-gray-500 text-sm">{Math.round(streamSettings.scale * 100)}%</span>
                        </div>
                        <Slider 
                          id="scale"
                          disabled={!isConnected}
                          min={0.5}
                          max={1.0}
                          step={0.1}
                          value={[streamSettings.scale]}
                          onValueChange={(value) => handleUpdateSettings({ scale: value[0] })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="input-control">Enable Input Control</Label>
                        <Switch 
                          id="input-control"
                          disabled={!isConnected}
                          checked={streamSettings.inputControl}
                          onCheckedChange={(checked) => handleUpdateSettings({ inputControl: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="audio">Enable Audio</Label>
                        <Switch 
                          id="audio"
                          disabled={!isConnected}
                          checked={streamSettings.audio}
                          onCheckedChange={(checked) => handleUpdateSettings({ audio: checked })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Device Info Panel */}
              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    {isConnected && selectedDevice ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold">Device Details</h3>
                          <p className="text-sm text-gray-500">{selectedDevice.name}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <h4 className="text-xs font-medium text-gray-500">Status</h4>
                            <p className="text-sm">{selectedDevice.status}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-gray-500">Platform</h4>
                            <p className="text-sm">{selectedDevice.platform}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-gray-500">OS</h4>
                            <p className="text-sm">{selectedDevice.os}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-gray-500">Last Active</h4>
                            <p className="text-sm">{new Date(selectedDevice.lastActive).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Session Information</h3>
                          <div className="space-y-2">
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Session Duration</h4>
                              <p className="text-sm">{getSessionDuration()}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Current FPS</h4>
                              <p className="text-sm">{currentFps}</p>
                            </div>
                            <div>
                              <h4 className="text-xs font-medium text-gray-500">Quality</h4>
                              <p className="text-sm">{streamSettings.quality}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-6">
                        <Eye className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-600">Not Connected</h3>
                        <p className="text-sm text-gray-500 mt-2">
                          Connect to a device to view information
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-medium mb-4">Start Remote Session</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="device-select">Select Device</Label>
                  <Select 
                    value={selectedDeviceId || ""} 
                    onValueChange={setSelectedDeviceId}
                  >
                    <SelectTrigger id="device-select">
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingDevices ? (
                        <div className="flex justify-center py-2">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : onlineDevices.length === 0 ? (
                        <div className="p-2 text-center text-sm text-gray-500">
                          No online devices available
                        </div>
                      ) : (
                        onlineDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.name} ({device.platform})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  
                  {onlineDevices.length === 0 && !isLoadingDevices && (
                    <p className="text-sm text-amber-600 mt-2">
                      All devices are offline. Make sure a device is online before starting a remote session.
                    </p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium text-sm mb-3">Stream Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <p className="text-sm text-gray-500 col-span-2 mb-1">Quality:</p>
                      {(['low', 'medium', 'high', 'ultra'] as const).map(quality => (
                        <Button 
                          key={quality}
                          variant={streamSettings.quality === quality ? "default" : "outline"}
                          className="h-auto py-2"
                          onClick={() => setStreamSettings({...streamSettings, quality})}
                        >
                          {quality.charAt(0).toUpperCase() + quality.slice(1)}
                        </Button>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="setup-fps">Frame Rate (FPS)</Label>
                        <span className="text-gray-500 text-sm">{streamSettings.fps}</span>
                      </div>
                      <Slider 
                        id="setup-fps"
                        min={5}
                        max={60}
                        step={5}
                        value={[streamSettings.fps]}
                        onValueChange={(value) => setStreamSettings({...streamSettings, fps: value[0]})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="setup-input-control">Enable Input Control</Label>
                      <Switch 
                        id="setup-input-control"
                        checked={streamSettings.inputControl}
                        onCheckedChange={(checked) => setStreamSettings({...streamSettings, inputControl: checked})}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="setup-audio">Enable Audio</Label>
                      <Switch 
                        id="setup-audio"
                        checked={streamSettings.audio}
                        onCheckedChange={(checked) => setStreamSettings({...streamSettings, audio: checked})}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button 
                    className="w-full"
                    onClick={handleStartSession} 
                    disabled={isLoading || !selectedDeviceId || startSessionMutation.isPending || onlineDevices.length === 0}
                  >
                    {startSessionMutation.isPending || isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    Start Remote Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Keyboard Input Dialog */}
      <Dialog open={showKeyboardInput} onOpenChange={setShowKeyboardInput}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Keyboard Input</DialogTitle>
            <DialogDescription>
              Enter text to send to the remote device.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Input
              value={keyboardText}
              onChange={(e) => setKeyboardText(e.target.value)}
              placeholder="Type text to send..."
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowKeyboardInput(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendKeys}
              disabled={!keyboardText.trim() || sendKeysMutation.isPending}
            >
              {sendKeysMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* End Session Confirmation Dialog */}
      <Dialog open={confirmEndSession} onOpenChange={setConfirmEndSession}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Remote Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to end the current remote session?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmEndSession(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => endSessionMutation.mutate()}
              disabled={endSessionMutation.isPending}
            >
              {endSessionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "End Session"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}