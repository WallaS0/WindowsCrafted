import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import DevicesPage from "@/pages/devices-page";
import DeviceDetailPage from "@/pages/device-detail-page";
import CommandsPage from "@/pages/commands-page";
import FileManagerPage from "@/pages/file-manager-page";
import SettingsPage from "@/pages/settings-page";
import AuthPage from "@/pages/auth-page";
import RemoteControlPage from "@/pages/remote-control-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Auth page */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/devices" component={DevicesPage} />
      <ProtectedRoute path="/devices/:id" component={DeviceDetailPage} />
      <ProtectedRoute path="/commands" component={CommandsPage} />
      <ProtectedRoute path="/files" component={FileManagerPage} />
      <ProtectedRoute path="/remote-control" component={RemoteControlPage} />
      <ProtectedRoute path="/remote-control/:deviceId" component={RemoteControlPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
