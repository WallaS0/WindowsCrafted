import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, actions }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-gray-900/50">
          <div className="fixed inset-y-0 left-0 w-64 bg-white">
            <div className="flex justify-end p-4">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar onNavItemClick={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-semibold text-blue-600 flex items-center">
            <i className="fas fa-network-wired mr-2"></i>
            RemoteControl
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Page Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-700">{title}</h1>
              <div className="flex space-x-4">
                {actions}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
