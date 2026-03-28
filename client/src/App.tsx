import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Leads from "@/pages/Leads";
import Conversations from "@/pages/Conversations";
import ConversationDetail from "@/pages/ConversationDetail";
import Products from "@/pages/Products";
import Analytics from "@/pages/Analytics";
import Subsidies from "@/pages/Subsidies";
import Settings from "@/pages/Settings";
import ChatBot from "@/pages/ChatBot";
import DashboardLayout from "@/components/DashboardLayout";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";

function AuthenticatedRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/leads" component={Leads} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/conversations/:id" component={ConversationDetail} />
        <Route path="/products" component={Products} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/subsidies" component={Subsidies} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  const { user, loading } = useAuth();

  return (
    <Switch>
      {/* Public chat route - accessible without login */}
      <Route path="/chat/:slug" component={ChatBot} />

      {/* Everything else */}
      <Route>
        {() => {
          if (loading) {
            return (
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            );
          }
          if (!user) {
            return (
              <Switch>
                <Route path="/" component={Home} />
                <Route component={Home} />
              </Switch>
            );
          }
          return <AuthenticatedRoutes />;
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
