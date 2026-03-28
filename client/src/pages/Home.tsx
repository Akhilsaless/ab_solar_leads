import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, Users, Megaphone, FileText, Upload, Search,
  Shield, Tag, TrendingUp, ArrowUpRight, ArrowDownRight,
  Zap, Mail, MessageSquare, Phone, Globe
} from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["#e8a735", "#4ade80", "#60a5fa", "#f472b6", "#a78bfa"];

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <DashboardHome />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg solar-gradient flex items-center justify-center">
              <Zap className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-lg">AB SOLAR</span>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="solar-gradient text-black font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Lead Outreach Platform
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Convert More Solar Leads
              <br />
              <span className="text-gradient">With Intelligent Outreach</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Import leads, scrape data from public sources, and automate multi-channel
              outreach via Email, SMS, WhatsApp, and Phone. Built for solar agencies
              that want to close more deals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => { window.location.href = getLoginUrl(); }}
                className="solar-gradient text-black font-semibold px-8 hover:opacity-90 transition-opacity"
              >
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="px-8">
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/50">
        <div className="container max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Close Solar Deals</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete lead management and outreach platform designed specifically for solar agencies.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Upload, title: "CSV/Excel Import", desc: "Bulk import leads from spreadsheets with automatic duplicate detection and data validation." },
              { icon: Globe, title: "Data Scraping", desc: "AI-powered lead generation from public property databases and real estate sources." },
              { icon: Mail, title: "Email Outreach", desc: "Send personalized email campaigns with dynamic variables and A/B testing." },
              { icon: MessageSquare, title: "SMS & WhatsApp", desc: "Multi-channel messaging with templates, scheduling, and delivery tracking." },
              { icon: Phone, title: "Call Tracking", desc: "Log calls, track outcomes, and manage follow-up sequences automatically." },
              { icon: BarChart3, title: "Analytics & ROI", desc: "Track conversion rates, campaign performance, and return on investment in real-time." },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="stat-card p-6 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="container max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Scale Your Solar Business?</h2>
          <p className="text-muted-foreground mb-8">
            Join agencies that are converting 3x more leads with AB SOLAR's intelligent outreach platform.
          </p>
          <Button
            size="lg"
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="solar-gradient text-black font-semibold px-10 hover:opacity-90"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded solar-gradient flex items-center justify-center">
              <Zap className="w-3 h-3 text-black" />
            </div>
            <span className="text-sm text-muted-foreground">AB SOLAR</span>
          </div>
          <p className="text-xs text-muted-foreground">Built for solar agencies</p>
        </div>
      </footer>
    </div>
  );
}

function DashboardHome() {
  const stats = trpc.leads.stats.useQuery();
  const [, setLocation] = useLocation();

  const statusData = stats.data?.byStatus
    ? Object.entries(stats.data.byStatus).map(([name, value]) => ({ name, value }))
    : [];

  const sourceData = stats.data?.bySource
    ? Object.entries(stats.data.bySource).map(([name, value]) => ({ name, value }))
    : [];

  // Mock trend data for the area chart
  const trendData = [
    { month: "Jan", leads: 12 }, { month: "Feb", leads: 19 },
    { month: "Mar", leads: 28 }, { month: "Apr", leads: 35 },
    { month: "May", leads: 42 }, { month: "Jun", leads: 58 },
  ];

  const total = stats.data?.total || 0;
  const converted = stats.data?.byStatus?.converted || 0;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of your lead generation performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/leads/import")}>
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
          <Button size="sm" className="solar-gradient text-black" onClick={() => setLocation("/leads")}>
            <Users className="w-4 h-4 mr-2" /> View Leads
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={total.toString()}
          icon={Users}
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          trend="+3.2%"
          trendUp={true}
        />
        <StatCard
          title="Qualified"
          value={(stats.data?.byStatus?.qualified || 0).toString()}
          icon={Shield}
          trend="+8%"
          trendUp={true}
        />
        <StatCard
          title="New This Week"
          value={(stats.data?.byStatus?.new || 0).toString()}
          icon={Zap}
          trend="+15%"
          trendUp={true}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead Trend Chart */}
        <div className="lg:col-span-2 stat-card">
          <h3 className="font-semibold mb-4">Lead Growth Trend</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8a735" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e8a735" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.155 0.005 260)",
                    border: "1px solid oklch(0.24 0.005 260)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="#e8a735" fill="url(#colorLeads)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4">Lead Status</h3>
          {statusData.length > 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.155 0.005 260)",
                      border: "1px solid oklch(0.24 0.005 260)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              No lead data yet
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {statusData.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-muted-foreground capitalize">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Upload, title: "Import Leads", desc: "Upload CSV/Excel files", path: "/leads/import", color: "text-blue-400" },
          { icon: Search, title: "Scrape Data", desc: "Find leads from sources", path: "/scrape", color: "text-green-400" },
          { icon: Megaphone, title: "New Campaign", desc: "Create outreach campaign", path: "/campaigns/new", color: "text-purple-400" },
          { icon: FileText, title: "Templates", desc: "Manage message templates", path: "/templates", color: "text-orange-400" },
        ].map((action) => (
          <button
            key={action.title}
            onClick={() => setLocation(action.path)}
            className="stat-card text-left group cursor-pointer"
          >
            <action.icon className={`w-5 h-5 ${action.color} mb-3`} />
            <h4 className="font-medium text-sm">{action.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className={`text-xs font-medium flex items-center gap-0.5 mb-1 ${trendUp ? "text-green-400" : "text-red-400"}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </span>
      </div>
    </div>
  );
}
