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
import BusinessScraper from "@/pages/BusinessScraper";
import Pricing from "@/pages/Pricing";
import ReferrerSignup from "@/pages/ReferrerSignup";
import ReferrerDashboard from "@/pages/ReferrerDashboard";
import ReferralManagement from "@/pages/ReferralManagement";
import ReferralLanding from "@/pages/ReferralLanding";
import ReferralTerms from "@/pages/ReferralTerms";
import VerifyReferral from "@/pages/VerifyReferral";
import PartnerOutreach from "@/pages/PartnerOutreach";
import PartnerSignup from "@/pages/PartnerSignup";
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
        <Route path="/scraper" component={BusinessScraper} />
        <Route path="/subsidies" component={Subsidies} />
        <Route path="/pricing" component={Pricing} />
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

      {/* Referrer signup and dashboard */}
      <Route path="/referrer-signup" component={ReferrerSignup} />
      <Route path="/referrer/dashboard" component={ReferrerDashboard} />
      <Route path="/referral-landing/:code" component={ReferralLanding} />
      <Route path="/referral-landing" component={ReferralLanding} />
      <Route path="/refer/:code" component={ChatBot} />
      <Route path="/admin/referrals" component={ReferralManagement} />
      <Route path="/terms-referral" component={ReferralTerms} />
      <Route path="/verify-referral" component={VerifyReferral} />

      {/* Partner outreach and signup */}
      <Route path="/partner-outreach" component={PartnerOutreach} />
      <Route path="/partner-signup" component={PartnerSignup} />

      {/* Public pricing page */}
      <Route path="/pricing" component={Pricing} />

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
