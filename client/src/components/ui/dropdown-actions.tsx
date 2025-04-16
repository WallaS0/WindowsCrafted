import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

export interface DropdownAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface DropdownActionsProps {
  actions: DropdownAction[];
  menuTitle?: string;
  trigger?: React.ReactNode;
}

export function DropdownActions({ 
  actions, 
  menuTitle,
  trigger = <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
}: DropdownActionsProps) {
  // Separate destructive actions from normal actions
  const normalActions = actions.filter(action => action.variant !== "destructive");
  const destructiveActions = actions.filter(action => action.variant === "destructive");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {menuTitle && (
          <>
            <p className="px-2 py-1.5 text-sm font-semibold">{menuTitle}</p>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          {normalActions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className="cursor-pointer"
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        
        {destructiveActions.length > 0 && normalActions.length > 0 && (
          <DropdownMenuSeparator />
        )}
        
        {destructiveActions.length > 0 && (
          <DropdownMenuGroup>
            {destructiveActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className="text-red-600 cursor-pointer focus:text-red-600"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
