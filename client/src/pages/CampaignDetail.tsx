import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ArrowLeft, Play, Pause, BarChart3, Mail, MessageSquare, Phone,
  Globe, Users, Send, Plus, Zap, Clock, CheckCircle2, XCircle,
  Eye, Trash2, ChevronRight
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  phone: Phone,
  multi: Globe,
};

const CHART_COLORS = ["#e8a735", "#4ade80", "#60a5fa", "#f472b6", "#a78bfa"];

export default function CampaignDetail() {
  const [, params] = useRoute("/campaigns/:id");
  const [, setLocation] = useLocation();
  const campaignId = params?.id ? parseInt(params.id) : 0;

  const campaign = trpc.campaigns.getById.useQuery({ id: campaignId }, { enabled: !!campaignId });
  const leads = trpc.leads.list.useQuery({});
  const outreach = trpc.outreach.list.useQuery({ campaignId });

  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showAddStep, setShowAddStep] = useState(false);
  const [tab, setTab] = useState<"overview" | "leads" | "messages" | "ab-test">("overview");

  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => { campaign.refetch(); toast.success("Campaign updated"); },
  });

  const launchCampaign = trpc.campaigns.launch.useMutation({
    onSuccess: (data) => {
      campaign.refetch();
      outreach.refetch();
      toast.success(`Campaign launched! ${data.queuedCount} messages queued`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!campaignId) return <div className="p-8 text-center text-muted-foreground">Campaign not found</div>;

  const c = campaign.data?.campaign;
  const steps = campaign.data?.steps || [];
  const messages = outreach.data || [];

  const stats = useMemo(() => {
    const total = messages.length;
    const sent = messages.filter((m: any) => ["sent", "delivered", "opened", "responded"].includes(m.status)).length;
    const delivered = messages.filter((m: any) => ["delivered", "opened", "responded"].includes(m.status)).length;
    const opened = messages.filter((m: any) => ["opened", "responded"].includes(m.status)).length;
    const responded = messages.filter((m: any) => m.status === "responded").length;
    const failed = messages.filter((m: any) => m.status === "failed").length;
    return { total, sent, delivered, opened, responded, failed };
  }, [messages]);

  const abData = useMemo(() => {
    const variantA = messages.filter((m: any) => m.abVariant === "A" || !m.abVariant);
    const variantB = messages.filter((m: any) => m.abVariant === "B");
    return [
      {
        name: "Variant A",
        sent: variantA.length,
        opened: variantA.filter((m: any) => ["opened", "responded"].includes(m.status)).length,
        responded: variantA.filter((m: any) => m.status === "responded").length,
      },
      {
        name: "Variant B",
        sent: variantB.length,
        opened: variantB.filter((m: any) => ["opened", "responded"].includes(m.status)).length,
        responded: variantB.filter((m: any) => m.status === "responded").length,
      },
    ];
  }, [messages]);

  if (campaign.isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="stat-card h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!c) return <div className="p-8 text-center text-muted-foreground">Campaign not found</div>;

  const ChannelIcon = CHANNEL_ICONS[c.channel] || Globe;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/campaigns")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center channel-${c.channel}`}>
                <ChannelIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{c.name}</h1>
                <p className="text-sm text-muted-foreground">{c.description || "No description"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {c.status === "draft" && selectedLeads.length > 0 && (
            <Button
              className="solar-gradient text-black"
              onClick={() => launchCampaign.mutate({ campaignId: c.id, leadIds: selectedLeads })}
              disabled={launchCampaign.isPending}
            >
              <Play className="w-4 h-4 mr-1" />
              {launchCampaign.isPending ? "Launching..." : `Launch (${selectedLeads.length} leads)`}
            </Button>
          )}
          {c.status === "active" && (
            <Button variant="outline" onClick={() => updateCampaign.mutate({ id: c.id, status: "paused" })}>
              <Pause className="w-4 h-4 mr-1" /> Pause
            </Button>
          )}
          {c.status === "paused" && (
            <Button className="solar-gradient text-black" onClick={() => updateCampaign.mutate({ id: c.id, status: "active" })}>
              <Play className="w-4 h-4 mr-1" /> Resume
            </Button>
          )}
          <span className={`status-badge status-${c.status === "active" ? "qualified" : c.status === "completed" ? "converted" : c.status === "paused" ? "contacted" : "new"} self-center`}>
            {c.status}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold">{c.targetLeadCount || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Targets</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.sent}</p>
          <p className="text-xs text-muted-foreground mt-1">Sent</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-green-400">{stats.delivered}</p>
          <p className="text-xs text-muted-foreground mt-1">Delivered</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-primary">{stats.opened}</p>
          <p className="text-xs text-muted-foreground mt-1">Opened</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats.responded}</p>
          <p className="text-xs text-muted-foreground mt-1">Responded</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
          <p className="text-xs text-muted-foreground mt-1">Failed</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {(["overview", "leads", "messages", "ab-test"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "ab-test" ? "A/B Test" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Steps */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Campaign Steps
              </h3>
            </div>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No steps configured</p>
            ) : (
              <div className="space-y-3">
                {steps.map((step: any, i: number) => (
                  <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="w-7 h-7 rounded-full solar-gradient flex items-center justify-center text-black text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium capitalize">{step.channel}</span>
                        {step.delayDays > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{step.delayDays}d {step.delayHours > 0 ? `${step.delayHours}h` : ""}
                          </span>
                        )}
                      </div>
                      {step.subject && <p className="text-xs text-muted-foreground truncate">Subject: {step.subject}</p>}
                      <p className="text-xs text-muted-foreground truncate">{step.body}</p>
                      {step.abVariantB && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">A/B Test</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Chart */}
          <div className="stat-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Sent", value: stats.sent, fill: "#60a5fa" },
                { name: "Delivered", value: stats.delivered, fill: "#4ade80" },
                { name: "Opened", value: stats.opened, fill: "#e8a735" },
                { name: "Responded", value: stats.responded, fill: "#34d399" },
                { name: "Failed", value: stats.failed, fill: "#f87171" },
              ]}>
                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { name: "Sent", fill: "#60a5fa" },
                    { name: "Delivered", fill: "#4ade80" },
                    { name: "Opened", fill: "#e8a735" },
                    { name: "Responded", fill: "#34d399" },
                    { name: "Failed", fill: "#f87171" },
                  ].map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === "leads" && (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Select Leads for Campaign
            </h3>
            <span className="text-xs text-muted-foreground">{selectedLeads.length} selected</span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {leads.isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
            ) : leads.data?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No leads available. Import or add leads first.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <Checkbox
                    checked={selectedLeads.length === (leads.data?.length || 0) && selectedLeads.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedLeads(leads.data?.map((l: any) => l.id) || []);
                      } else {
                        setSelectedLeads([]);
                      }
                    }}
                  />
                  <span className="text-xs font-medium">Select All ({leads.data?.length})</span>
                </div>
                {leads.data?.map((lead: any) => (
                  <div
                    key={lead.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedLeads.includes(lead.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-card"
                    }`}
                    onClick={() => {
                      setSelectedLeads(prev =>
                        prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
                      );
                    }}
                  >
                    <Checkbox checked={selectedLeads.includes(lead.id)} />
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                      {lead.firstName?.[0]}{lead.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email || lead.phone || "No contact"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`status-badge status-${lead.status}`}>{lead.status}</span>
                      <span className={`text-[10px] font-semibold priority-${lead.priority}`}>{lead.priority}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "messages" && (
        <div className="stat-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Outreach Messages
          </h3>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No messages sent yet. Launch the campaign to start outreach.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {messages.map((msg: any) => (
                <div key={msg.id} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    msg.status === "responded" ? "bg-emerald-500/20 text-emerald-400" :
                    msg.status === "opened" ? "bg-primary/20 text-primary" :
                    msg.status === "failed" ? "bg-red-500/20 text-red-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>
                    {msg.status === "responded" ? <CheckCircle2 className="w-4 h-4" /> :
                     msg.status === "failed" ? <XCircle className="w-4 h-4" /> :
                     <Send className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{msg.channel}</span>
                      {msg.abVariant && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Variant {msg.abVariant}
                        </span>
                      )}
                    </div>
                    {msg.subject && <p className="text-xs text-muted-foreground truncate">{msg.subject}</p>}
                    <p className="text-xs text-muted-foreground truncate">{msg.body}</p>
                  </div>
                  <span className={`status-badge status-${
                    msg.status === "responded" ? "converted" :
                    msg.status === "opened" ? "qualified" :
                    msg.status === "failed" ? "lost" : "new"
                  }`}>
                    {msg.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "ab-test" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> A/B Test Results
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={abData}>
                <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="sent" fill="#60a5fa" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="#e8a735" name="Opened" radius={[4, 4, 0, 0]} />
                <Bar dataKey="responded" fill="#4ade80" name="Responded" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="stat-card">
            <h3 className="font-semibold mb-4">Variant Comparison</h3>
            <div className="space-y-4">
              {abData.map((variant, i) => (
                <div key={variant.name} className="p-4 rounded-lg bg-background/50 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">{variant.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      i === 0 ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                    }`}>
                      {variant.sent > 0 ? ((variant.responded / variant.sent) * 100).toFixed(1) : 0}% response rate
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{variant.sent}</p>
                      <p className="text-[10px] text-muted-foreground">Sent</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-primary">{variant.opened}</p>
                      <p className="text-[10px] text-muted-foreground">Opened</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-400">{variant.responded}</p>
                      <p className="text-[10px] text-muted-foreground">Responded</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
