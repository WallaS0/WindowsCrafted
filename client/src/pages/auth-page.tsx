import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Network } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
    },
  });
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };
  
  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  // Loading state for entire page
  if (loginMutation.isPending && !loginForm.formState.isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Auth forms */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 px-4 sm:px-6 lg:px-8 py-12">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 flex items-center justify-center">
            <Network className="h-8 w-8 mr-2 text-blue-600" />
            RemoteControl
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Remote administration platform for your devices
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <Tabs defaultValue="login" value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign in"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("register")}>
                      Register
                    </Button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Sign up to start managing your devices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          "Create account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={() => setActiveTab("login")}>
                      Sign in
                    </Button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero image and info */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="h-full flex flex-col justify-center px-12">
          <h1 className="text-4xl font-bold mb-6">Remote Device Administration Platform</h1>
          <p className="text-xl mb-8">
            A comprehensive solution for managing and controlling your iOS and Android devices remotely.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-500 bg-opacity-20">
                <i className="fas fa-desktop text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium">Remote Monitoring</h3>
                <p className="mt-1 text-blue-100">
                  View device screens and status in real-time
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-500 bg-opacity-20">
                <i className="fas fa-file-alt text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium">File Management</h3>
                <p className="mt-1 text-blue-100">
                  Access, transfer, and manage files remotely
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-500 bg-opacity-20">
                <i className="fas fa-terminal text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium">Command Execution</h3>
                <p className="mt-1 text-blue-100">
                  Send commands and view results instantly
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-500 bg-opacity-20">
                <i className="fas fa-shield-alt text-xl"></i>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium">Secure Connection</h3>
                <p className="mt-1 text-blue-100">
                  End-to-end encrypted communication
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
