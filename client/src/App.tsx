import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Leads from "@/pages/Leads";
import LeadDetailPage from "@/pages/LeadDetailPage";
import ImportLeads from "@/pages/ImportLeads";
import Campaigns from "@/pages/Campaigns";
import Templates from "@/pages/Templates";
import Analytics from "@/pages/Analytics";
import Scraper from "@/pages/Scraper";
import MapPage from "@/pages/MapPage";
import DNCList from "@/pages/DNCList";
import Settings from "@/pages/Settings";
import CampaignDetail from "@/pages/CampaignDetail";
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
        <Route path="/leads/import" component={ImportLeads} />
        <Route path="/leads/:id" component={LeadDetailPage} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/new" component={Campaigns} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/templates" component={Templates} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/scrape" component={Scraper} />
        <Route path="/map" component={MapPage} />
        <Route path="/dnc" component={DNCList} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  // If not logged in, show landing page on root, otherwise show dashboard
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Home} />
        <Route component={Home} />
      </Switch>
    );
  }

  return <AuthenticatedRoutes />;
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
