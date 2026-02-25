import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SessionTimeoutWarning } from "@/components/SessionTimeoutWarning";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import UserGuide from "@/pages/user-guide";
import License from "@/pages/license";
import Terms from "@/pages/terms";
import UsersPage from "@/pages/users";
import Playground from "@/pages/playground";
import Analytics from "@/pages/analytics";
import Status from "@/pages/status";
import TeamsPage from "@/pages/teams";
import A2APage from "@/pages/a2a";
import ApiDocsPage from "@/pages/api-docs";
import NotFound from "@/pages/not-found";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

function AuthenticatedHome() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthenticatedHome} />
      <Route path="/login" component={Login} />
      <Route path="/guide" component={UserGuide} />
      <Route path="/license" component={License} />
      <Route path="/terms" component={Terms} />
      <Route path="/api-docs" component={ApiDocsPage} />
      <Route path="/status" component={Status} />
      <Route path="/users">{() => <ProtectedRoute><UsersPage /></ProtectedRoute>}</Route>
      <Route path="/playground">{() => <ProtectedRoute><Playground /></ProtectedRoute>}</Route>
      <Route path="/analytics">{() => <ProtectedRoute><Analytics /></ProtectedRoute>}</Route>
      <Route path="/teams">{() => <ProtectedRoute><TeamsPage /></ProtectedRoute>}</Route>
      <Route path="/a2a">{() => <ProtectedRoute><A2APage /></ProtectedRoute>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <Toaster />
              <Router />
              <SessionTimeoutWarning />
            </ErrorBoundary>
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
