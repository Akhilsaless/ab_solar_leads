import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("@/pages/Home"));
const Leads = lazy(() => import("@/pages/Leads"));
const Conversations = lazy(() => import("@/pages/Conversations"));
const ConversationDetail = lazy(() => import("@/pages/ConversationDetail"));
const Products = lazy(() => import("@/pages/Products"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Subsidies = lazy(() => import("@/pages/Subsidies"));
const Settings = lazy(() => import("@/pages/Settings"));
const SmartChatBot = lazy(() => import("@/pages/SmartChatBot"));
const BusinessScraper = lazy(() => import("@/pages/BusinessScraper"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const ReferrerSignup = lazy(() => import("@/pages/ReferrerSignup"));
const ReferrerDashboard = lazy(() => import("@/pages/ReferrerDashboard"));
const ReferralManagement = lazy(() => import("@/pages/ReferralManagement"));
const ReferralLanding = lazy(() => import("@/pages/ReferralLanding"));
const ReferralTerms = lazy(() => import("@/pages/ReferralTerms"));
const VerifyReferral = lazy(() => import("@/pages/VerifyReferral"));
const PartnerOutreach = lazy(() => import("@/pages/PartnerOutreach"));
const PartnerSignup = lazy(() => import("@/pages/PartnerSignup"));
const ForPartners = lazy(() => import("@/pages/ForPartners"));
const PartnerDashboard = lazy(() => import("@/pages/PartnerDashboard"));
const ScrapedContacts = lazy(() => import("@/pages/ScrapedContacts"));
const ProductGuide = lazy(() => import("@/pages/ProductGuide"));
const AutomatedOutreach = lazy(() => import("@/pages/AutomatedOutreach").then(module => ({ default: module.AutomatedOutreach })));
const WhatsAppSettings = lazy(() => import("@/pages/WhatsAppSettings").then(module => ({ default: module.WhatsAppSettings })));
const HostelReferrerSignup = lazy(() => import("@/pages/HostelReferrerSignup").then(module => ({ default: module.HostelReferrerSignup })));
const QRCodeGenerator = lazy(() => import("@/pages/QRCodeGenerator").then(module => ({ default: module.QRCodeGenerator })));
const DualLeadPages = lazy(() => import("@/pages/DualLeadPages").then(module => ({ default: module.DualLeadPages })));
const SolarBenefitsVideo = lazy(() => import("@/pages/SolarBenefitsVideo").then(module => ({ default: module.SolarBenefitsVideo })));
const PartnerSignupsAdmin = lazy(() => import("@/pages/PartnerSignupsAdmin"));
const Copilot = lazy(() => import("@/pages/Copilot"));
const FindLeads = lazy(() => import("@/pages/FindLeads"));
const Partners = lazy(() => import("@/pages/Partners"));
const Campaigns = lazy(() => import("@/pages/Campaigns"));
const CampaignDetail = lazy(() => import("@/pages/CampaignDetail"));
const NorthStar = lazy(() => import("@/pages/NorthStar"));
const ClientDeliveryReview = lazy(() => import("@/pages/ClientDeliveryReview"));
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
        <Route path="/north-star" component={NorthStar} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/campaigns" component={Campaigns} />
        {/* New merged routes */}
        <Route path="/find-leads" component={FindLeads} />
        <Route path="/partners" component={Partners} />
        {/* Legacy routes kept for backward compatibility */}
        <Route path="/scraper" component={BusinessScraper} />
        <Route path="/scraped-contacts" component={ScrapedContacts} />
        <Route path="/automated-outreach" component={AutomatedOutreach} />
        <Route path="/whatsapp-settings" component={WhatsAppSettings} />
        <Route path="/qr-generator" component={QRCodeGenerator} />
        <Route path="/dual-leads" component={DualLeadPages} />
        <Route path="/solar-video" component={SolarBenefitsVideo} />
        <Route path="/partner-signups" component={PartnerSignupsAdmin} />
        <Route path="/copilot" component={Copilot} />
        <Route path="/subsidies" component={Subsidies} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin/referrals" component={ReferralManagement} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  const { user, loading } = useAuth();

  return (
    <Switch>
      {/* Public smart chat route - accessible without login */}
      <Route path="/chat/:slug" component={SmartChatBot} />
      <Route path="/client/review/:token" component={ClientDeliveryReview} />

      {/* Referrer signup and dashboard */}
      <Route path="/referrer-signup" component={ReferrerSignup} />
      <Route path="/referrer/dashboard" component={ReferrerDashboard} />
      <Route path="/referral-landing/:code" component={ReferralLanding} />
      <Route path="/referral-landing" component={ReferralLanding} />
      <Route path="/refer/:code" component={SmartChatBot} />
      <Route path="/terms-referral" component={ReferralTerms} />
      <Route path="/verify-referral" component={VerifyReferral} />

      {/* Partner outreach and signup */}
      <Route path="/partner-outreach" component={PartnerOutreach} />
      <Route path="/partner-signup" component={PartnerSignup} />
      <Route path="/for-partners" component={ForPartners} />
      <Route path="/partner/dashboard" component={PartnerDashboard} />

      {/* Hostel referrer signup - public */}
      <Route path="/hostel-referrer" component={HostelReferrerSignup} />

      {/* Public pricing page */}
      <Route path="/pricing" component={Pricing} />

      {/* Product Guide - public */}
      <Route path="/product-guide" component={ProductGuide} />

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
          <Suspense fallback={<p role="status" className="p-6 text-muted-foreground">Loading page…</p>}><Router /></Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
