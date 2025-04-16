import React from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Save, Shield, Bell, User, Globe, History } from "lucide-react";

// Form schemas
const accountSettingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

type AccountSettingsFormValues = z.infer<typeof accountSettingsSchema>;

const securitySettingsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SecuritySettingsFormValues = z.infer<typeof securitySettingsSchema>;

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  deviceStatus: z.boolean(),
  commandCompletion: z.boolean(),
  securityAlerts: z.boolean(),
});

type NotificationSettingsFormValues = z.infer<typeof notificationSettingsSchema>;

const appSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.string(),
  sessionTimeout: z.string(),
  autoRefresh: z.boolean(),
});

type AppSettingsFormValues = z.infer<typeof appSettingsSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Account settings form
  const accountForm = useForm<AccountSettingsFormValues>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      name: user?.name || "",
      email: "user@example.com", // In a real app, this would come from the user object
    },
  });
  
  // Security settings form
  const securityForm = useForm<SecuritySettingsFormValues>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Notification settings form
  const notificationForm = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      deviceStatus: true,
      commandCompletion: true,
      securityAlerts: true,
    },
  });
  
  // App settings form
  const appForm = useForm<AppSettingsFormValues>({
    resolver: zodResolver(appSettingsSchema),
    defaultValues: {
      theme: "light",
      language: "en",
      sessionTimeout: "30",
      autoRefresh: true,
    },
  });
  
  // Account update mutation
  const updateAccountMutation = useMutation({
    mutationFn: async (data: AccountSettingsFormValues) => {
      // This would be a real API call in production
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ...data };
    },
    onSuccess: (data) => {
      toast({
        title: "Account Updated",
        description: "Your account information has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: SecuritySettingsFormValues) => {
      // This would be a real API call in production
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      securityForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationSettingsFormValues) => {
      // This would be a real API call in production
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ...data };
    },
    onSuccess: () => {
      toast({
        title: "Notifications Updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // App settings mutation
  const updateAppSettingsMutation = useMutation({
    mutationFn: async (data: AppSettingsFormValues) => {
      // This would be a real API call in production
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ...data };
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your application settings have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handlers
  const onAccountSubmit = (data: AccountSettingsFormValues) => {
    updateAccountMutation.mutate(data);
  };
  
  const onSecuritySubmit = (data: SecuritySettingsFormValues) => {
    updatePasswordMutation.mutate(data);
  };
  
  const onNotificationSubmit = (data: NotificationSettingsFormValues) => {
    updateNotificationsMutation.mutate(data);
  };
  
  const onAppSettingsSubmit = (data: AppSettingsFormValues) => {
    updateAppSettingsMutation.mutate(data);
  };

  return (
    <DashboardLayout title="Settings">
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="application" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Application</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Manage your account details and preferences.
              </CardDescription>
            </CardHeader>
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(onAccountSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={accountForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={accountForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormDescription>
                          This email will be used for account notifications.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div>
                    <Label>Username</Label>
                    <Input value={user?.username || ""} disabled className="bg-gray-50" />
                    <p className="text-sm text-gray-500 mt-1">
                      Username cannot be changed
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Account Role</h3>
                    <p className="text-sm bg-blue-50 text-blue-700 inline-block px-3 py-1 rounded-full">
                      {user?.role || "User"}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateAccountMutation.isPending}
                  >
                    {updateAccountMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences.
              </CardDescription>
            </CardHeader>
            <Form {...securityForm}>
              <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)}>
                <CardContent className="space-y-6">
                  <h3 className="text-base font-medium">Change Password</h3>
                  
                  <FormField
                    control={securityForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={securityForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Password must be at least 8 characters and include uppercase, lowercase, and a number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={securityForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-gray-500">
                          Add an extra layer of security to your account
                        </div>
                      </div>
                      <Button variant="outline" disabled>
                        Not Available
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Session Management</h3>
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-medium">Current Session</div>
                          <div className="text-sm text-gray-500">
                            This browser session
                          </div>
                        </div>
                        <div className="text-sm font-medium text-green-600">Active</div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="h-4 w-4" />
                          <span>Chrome on Windows</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4" />
                          <span>Started 2 hours ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updatePasswordMutation.isPending}
                  >
                    {updatePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications.
              </CardDescription>
            </CardHeader>
            <Form {...notificationForm}>
              <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Email Notifications</FormLabel>
                          <FormDescription>
                            Receive notifications via email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-base font-medium">Notification Types</h3>
                    
                    <FormField
                      control={notificationForm.control}
                      name="deviceStatus"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2">
                          <div className="space-y-0.5">
                            <FormLabel>Device Status Changes</FormLabel>
                            <FormDescription>
                              When a device goes online or offline
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="commandCompletion"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2">
                          <div className="space-y-0.5">
                            <FormLabel>Command Completion</FormLabel>
                            <FormDescription>
                              When a command is completed or fails
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={notificationForm.control}
                      name="securityAlerts"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2">
                          <div className="space-y-0.5">
                            <FormLabel>Security Alerts</FormLabel>
                            <FormDescription>
                              Important security-related notifications
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateNotificationsMutation.isPending}
                  >
                    {updateNotificationsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
        
        {/* Application Settings */}
        <TabsContent value="application">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Customize your application experience.
              </CardDescription>
            </CardHeader>
            <Form {...appForm}>
              <form onSubmit={appForm.handleSubmit(onAppSettingsSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={appForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System Default</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select your preferred theme for the application.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={appForm.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="zh">Chinese</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Set your preferred language for the application interface.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={appForm.control}
                    name="sessionTimeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Timeout (minutes)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select timeout" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="240">4 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Set how long until your session expires due to inactivity.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={appForm.control}
                    name="autoRefresh"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                          <FormLabel>Auto-refresh Data</FormLabel>
                          <FormDescription>
                            Automatically refresh device data and status
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-base font-medium mb-4">Data & Privacy</h3>
                    <div className="rounded-lg border p-4 space-y-4">
                      <div>
                        <div className="font-medium">Usage Data</div>
                        <p className="text-sm text-gray-500 mt-1">
                          We collect anonymous usage data to improve the application experience.
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Privacy Policy
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateAppSettingsMutation.isPending}
                  >
                    {updateAppSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
