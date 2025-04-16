import React from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Navigation item definition
interface NavItem {
  title: string;
  path: string;
  icon: string;
}

// Navigation items for the sidebar
const navItems: NavItem[] = [
  { title: "Dashboard", path: "/", icon: "fa-tachometer-alt" },
  { title: "Devices", path: "/devices", icon: "fa-desktop" },
  { title: "Remote Control", path: "/remote-control", icon: "fa-eye" },
  { title: "Commands", path: "/commands", icon: "fa-terminal" },
  { title: "File Manager", path: "/files", icon: "fa-file-alt" },
  { title: "Settings", path: "/settings", icon: "fa-cog" },
];

interface SidebarProps {
  onNavItemClick?: () => void;
}

export function Sidebar({ onNavItemClick }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-blue-600 flex items-center">
          <i className="fas fa-network-wired mr-2"></i>
          RemoteControl
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="px-2 mb-2">
              <Link href={item.path}>
                <a
                  onClick={onNavItemClick}
                  className={cn(
                    "flex items-center px-4 py-2 rounded-md transition-colors",
                    location === item.path
                      ? "bg-blue-100 text-blue-600 border-l-4 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-blue-600"
                  )}
                >
                  <i className={cn("fas", item.icon, "w-6")}></i>
                  <span>{item.title}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User area */}
      <div className="p-4 border-t border-gray-200">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-start gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700 truncate">{user?.name || user?.username}</p>
                <p className="text-xs text-gray-500">{user?.role || "User"}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
