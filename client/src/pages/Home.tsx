import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare, Users, TrendingUp, Zap, ArrowRight,
  Copy, ExternalLink, Sun, IndianRupee, Clock, Share2, Gift, BookOpen
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: agency, isLoading: agencyLoading } = trpc.agency.get.useQuery();
  const { data: convStats } = trpc.conversations.stats.useQuery();
  const { data: conversations } = trpc.conversations.list.useQuery();
  const { data: leads } = trpc.leads.list.useQuery();

  // If no agency configured yet, show setup
  if (!agencyLoading && !agency) {
    return <AgencySetup />;
  }

  const chatLink = agency ? `${window.location.origin}/chat/${agency.agencySlug}` : "";
  const recentConversations = (conversations || []).slice(0, 5);
  const recentLeads = (leads || []).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {agency?.agencyName?.split(" ")[0] || user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your AI sales bot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(chatLink);
              toast.success("Chat link copied!");
            }}
            className="gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Bot Link
          </Button>
          <Button
            size="sm"
            className="gap-2 solar-gradient text-black"
            onClick={() => window.open(chatLink, "_blank")}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Test Bot
          </Button>
        </div>
      </div>

      {/* Referrer Recruitment Video Card */}
      <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-lg">🎬</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Referrer Recruitment Video</p>
              <p className="text-xs text-muted-foreground mt-0.5">Share this video to recruit new referrers — ₹50 bonus on signup</p>
              <p className="text-xs text-green-600 font-mono mt-1 truncate">{window.location.origin}/product-guide</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/product-guide`); toast.success("Video link copied!"); }}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.open(`/product-guide`, "_blank")}>
                <ExternalLink className="w-3.5 h-3.5" />
                View
              </Button>
              <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => { const msg = encodeURIComponent(`💰 *Earn ₹1,500 per Solar Installation!*\n\nAgent Klaus does all the work. You just share your link and earn.\n\n🎬 Demo Video:\nhttps://files.manuscdn.com/user_upload_by_module/session_file/310519663486128902/QdycXBdVpQteWfXP.mp4\n\n🔗 Sign Up & Get Your Code:\n${window.location.origin}/referrer-signup\n\n✅ ₹50 bonus on signup\n✅ No selling needed\n✅ Earn ₹1,500 per installation`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }}>
                📱 Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links Banner */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Chat Link */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl solar-gradient flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Chatbot Link</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{chatLink}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(chatLink); toast.success("Copied!"); }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Link */}
        <Card className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Referral Link</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{window.location.origin}/referral-landing</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/referral-landing`); toast.success("Copied!"); }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Total Conversations"
          value={convStats?.total || 0}
          color="text-blue-400"
          bgColor="bg-blue-400/10"
        />
        <StatCard
          icon={Users}
          label="Leads Captured"
          value={convStats?.leadsCaptured || 0}
          color="text-green-400"
          bgColor="bg-green-400/10"
        />
        <StatCard
          icon={IndianRupee}
          label="Estimates Given"
          value={convStats?.estimatesGiven || 0}
          color="text-amber-400"
          bgColor="bg-amber-400/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Converted"
          value={convStats?.converted || 0}
          color="text-emerald-400"
          bgColor="bg-emerald-400/10"
        />
      </div>

      {/* Referral Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Referral Program</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-orange-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">₹500</p>
              <p className="text-xs text-muted-foreground mt-1">Per signup</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-400">₹1,500</p>
              <p className="text-xs text-muted-foreground mt-1">Per installation</p>
            </div>
          </div>
          <Button size="sm" className="w-full gap-2" onClick={() => window.open("/admin/referrals", "_blank")}>
            <Users className="w-4 h-4" />
            Manage Referrals
          </Button>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Conversations</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/conversations")} className="text-xs gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Share your bot link to start getting leads</p>
              </div>
            ) : (
              recentConversations.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => setLocation(`/conversations/${conv.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {(conv.customerName || "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.customerName || "Unknown Visitor"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conv.customerState || "Unknown State"} · {conv.messageCount || 0} messages
                    </p>
                  </div>
                  <ConvStatusBadge status={conv.status} />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Leads</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="text-xs gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No leads captured yet</p>
                <p className="text-xs mt-1">Your AI bot will capture leads automatically</p>
              </div>
            ) : (
              recentLeads.map((lead: any) => (
                <button
                  key={lead.id}
                  onClick={() => setLocation(`/leads/${lead.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-green-400">
                      {(lead.firstName || "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.phone || lead.email || "No contact"} · Score: {lead.leadScore || 0}
                    </p>
                  </div>
                  <span className={`status-badge status-${lead.status}`}>{lead.status}</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bgColor }: {
  icon: any; label: string; value: number; color: string; bgColor: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ConvStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-400",
    lead_captured: "bg-green-500/10 text-green-400",
    estimate_given: "bg-amber-500/10 text-amber-400",
    converted: "bg-emerald-500/10 text-emerald-400",
    dropped: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[status] || styles.active}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// Agency Setup Component
function AgencySetup() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    agencyName: "",
    agencySlug: "",
    phone: "",
    email: "",
    state: "",
    city: "",
    botGreeting: "",
    botTone: "friendly",
    installationChargePerKw: "8000",
    marginPercent: "15",
  });

  const createAgency = trpc.agency.create.useMutation({
    onSuccess: () => {
      toast.success("Agency created! Now add your products.");
      window.location.reload();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSlugify = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl solar-gradient flex items-center justify-center mx-auto mb-4">
          <Sun className="w-8 h-8 text-black" />
        </div>
        <h1 className="text-2xl font-bold">Set Up Your Agency</h1>
        <p className="text-muted-foreground mt-2">
          Configure your agency to start using the AI sales bot
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Agency Name *</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.agencyName}
                onChange={(e) => setFormData({
                  ...formData,
                  agencyName: e.target.value,
                  agencySlug: handleSlugify(e.target.value),
                })}
                placeholder="e.g., SunPower Solutions"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Bot URL Slug *</label>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <span>{window.location.origin}/chat/</span>
                <span className="text-primary font-medium">{formData.agencySlug || "your-slug"}</span>
              </div>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.agencySlug}
                onChange={(e) => setFormData({ ...formData, agencySlug: handleSlugify(e.target.value) })}
                placeholder="your-agency-slug"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@agency.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">State</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">City</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Mumbai"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Installation ₹/kW</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.installationChargePerKw}
                onChange={(e) => setFormData({ ...formData, installationChargePerKw: e.target.value })}
                placeholder="8000"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Margin %</label>
              <input
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.marginPercent}
                onChange={(e) => setFormData({ ...formData, marginPercent: e.target.value })}
                placeholder="15"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Bot Tone</label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.botTone}
                onChange={(e) => setFormData({ ...formData, botTone: e.target.value })}
              >
                <option value="friendly">Friendly & Warm</option>
                <option value="professional">Professional</option>
                <option value="enthusiastic">Enthusiastic & Energetic</option>
                <option value="consultative">Consultative & Expert</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Custom Greeting (optional)</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                value={formData.botGreeting}
                onChange={(e) => setFormData({ ...formData, botGreeting: e.target.value })}
                placeholder="Leave empty for default greeting. Or write your own opening message..."
              />
            </div>
          </div>

          <Button
            className="w-full solar-gradient text-black font-semibold"
            onClick={() => createAgency.mutate(formData)}
            disabled={!formData.agencyName || !formData.agencySlug || createAgency.isPending}
          >
            {createAgency.isPending ? "Creating..." : "Create Agency & Get Started"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
