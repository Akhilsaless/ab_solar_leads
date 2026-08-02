import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AlertCircle, CheckCircle, Clock, MessageSquare, TrendingUp,
  Zap, Building2, Mail, Phone, CheckCircle2, XCircle, Loader2, Eye
} from "lucide-react";

function RunBusinessesModal({ runId, open, onClose }: { runId: number | null; open: boolean; onClose: () => void }) {
  const bizQuery = trpc.automatedOutreach.runs.getBusinesses.useQuery(
    { runId: runId! },
    { enabled: open && runId !== null }
  );
  const businesses = (bizQuery.data as any[]) || [];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Businesses Contacted in This Run</DialogTitle>
        </DialogHeader>
        {bizQuery.isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : businesses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No businesses found for this run.</p>
        ) : (
          <div className="space-y-2">
            {businesses.map((biz: any) => (
              <div key={biz.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{biz.businessName}</div>
                    <div className="text-xs text-muted-foreground truncate">{biz.address}</div>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {biz.phone && <span className="text-xs text-blue-400">{biz.phone}</span>}
                      {biz.email && <span className="text-xs text-green-400">{biz.email}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className={`text-xs ${
                      biz.contactStatus === 'contacted' ? 'text-green-400 border-green-500/30' :
                      biz.contactStatus === 'interested' ? 'text-blue-400 border-blue-500/30' :
                      'text-muted-foreground'
                    }`}>
                      {biz.contactStatus === 'contacted' ? 'Emailed' :
                       biz.contactStatus === 'interested' ? 'Interested' : 'Scraped'}
                    </Badge>
                    {biz.emailSentAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(biz.emailSentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const SLOT_SCHEDULE = [
  { slot: 1, time: "8:00 AM",   label: "Factories & Warehouses" },
  { slot: 2, time: "10:30 AM",  label: "Hotels & Resorts" },
  { slot: 3, time: "1:00 PM",   label: "Hospitals & Clinics" },
  { slot: 4, time: "4:00 PM",   label: "Schools & Colleges" },
  { slot: 5, time: "7:00 PM",   label: "Offices & Complexes" },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi",
  "Chandigarh","Puducherry","Jammu and Kashmir","Ladakh",
];

export function AutomatedOutreach() {
  const [activeTab, setActiveTab] = useState("smart");
  const [configId, setConfigId] = useState<number | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [showBizModal, setShowBizModal] = useState(false);

  // Smart cron state
  const [smartCity, setSmartCity] = useState("");
  const [smartState, setSmartState] = useState("");
  const [smartEnabled, setSmartEnabled] = useState(true);
  const [contactMethod, setContactMethod] = useState<"email" | "whatsapp" | "both">("both");

  // Smart cron queries
  const smartConfigQuery = trpc.automatedOutreach.smartConfig.get.useQuery();
  const runsQuery = trpc.automatedOutreach.runs.list.useQuery();
  const todayStatsQuery = trpc.automatedOutreach.runs.todayStats.useQuery();
  const updateSmartConfig = trpc.automatedOutreach.smartConfig.update.useMutation({
    onSuccess: () => {
      toast.success(`Saved! Auto outreach will target ${smartCity}, ${smartState} from next run.`);
      smartConfigQuery.refetch();
      todayStatsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (smartConfigQuery.data) {
      setSmartCity(smartConfigQuery.data.targetCity || "Hyderabad");
      setSmartState(smartConfigQuery.data.targetState || "Telangana");
      setSmartEnabled(!!smartConfigQuery.data.isEnabled);
      if (smartConfigQuery.data.contactMethod) {
        setContactMethod(smartConfigQuery.data.contactMethod as "email" | "whatsapp" | "both");
      }
    }
  }, [smartConfigQuery.data]);

  // Legacy queries
  const configQuery = trpc.automatedOutreach.config.get.useQuery();
  const todayQuery = trpc.automatedOutreach.records.getToday.useQuery();
  const repliesQuery = trpc.automatedOutreach.records.getReplies.useQuery();
  const dailyAnalyticsQuery = trpc.automatedOutreach.analytics.getDaily.useQuery();

  const createConfigMutation = trpc.automatedOutreach.config.create.useMutation();
  const updateConfigMutation = trpc.automatedOutreach.config.update.useMutation();
  const initializeScoringMutation = trpc.automatedOutreach.scoring.initializeScoring.useMutation();
  const updateStatusMutation = trpc.automatedOutreach.records.updateStatus.useMutation();

  const [formData, setFormData] = useState({
    state: "Telangana",
    businessTypes: ["textile_mills", "cold_storage", "hospitals", "factories"],
    minRating: "3.5",
    contactsPerDay: "30",
    scheduleTime: "10:00",
    messageType: "industry_specific" as const,
    adminPhoneNumber: "",
    outreachMode: "blind" as "blind" | "owner_only",
  });

  useEffect(() => {
    if (configQuery.data && configQuery.data.length > 0) {
      const config = configQuery.data[0];
      setConfigId(config.id);
      setFormData({
        state: config.state,
        businessTypes: config.businessTypes || [],
        minRating: config.minRating?.toString() || "3.5",
        contactsPerDay: config.contactsPerDay?.toString() || "30",
        scheduleTime: config.scheduleTime || "10:00",
        messageType: config.messageType || "industry_specific",
        adminPhoneNumber: config.adminPhoneNumber || "",
        outreachMode: (config.outreachMode as "blind" | "owner_only") || "blind",
      });
    }
  }, [configQuery.data]);

  const handleCreateConfig = async () => {
    try {
      await createConfigMutation.mutateAsync({
        state: formData.state,
        businessTypes: formData.businessTypes,
        minRating: parseFloat(formData.minRating),
        contactsPerDay: parseInt(formData.contactsPerDay),
        scheduleTime: formData.scheduleTime,
        messageType: formData.messageType,
        adminPhoneNumber: formData.adminPhoneNumber || undefined,
      });
      await configQuery.refetch();
      await initializeScoringMutation.mutateAsync();
    } catch (error) {
      console.error("Error creating config:", error);
    }
  };

  const handleUpdateConfig = async () => {
    if (!configId) return;
    try {
      await updateConfigMutation.mutateAsync({
        id: configId,
        contactsPerDay: parseInt(formData.contactsPerDay),
        scheduleTime: formData.scheduleTime,
        adminPhoneNumber: formData.adminPhoneNumber || undefined,
        outreachMode: formData.outreachMode,
      });
      await configQuery.refetch();
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  const handleReplyStatusChange = async (recordId: number, status: "interested" | "not_interested") => {
    try {
      await updateStatusMutation.mutateAsync({
        recordId,
        status: "replied",
        leadScore: status === "interested" ? 80 : 20,
      });
      await repliesQuery.refetch();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const analytics = dailyAnalyticsQuery.data;
  const todayRecords = todayQuery.data || [];
  const replies = repliesQuery.data || [];
  const todayStats = todayStatsQuery.data;
  const runs = (runsQuery.data || []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automated Outreach</h1>
          <p className="text-muted-foreground mt-1">Smart daily scrape + email/WhatsApp to high-potential businesses</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full">
          <TabsTrigger value="smart" className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Smart Auto (New)
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="today">Today's Outreach</TabsTrigger>
          <TabsTrigger value="replies">Replies</TabsTrigger>
        </TabsList>

        {/* ── SMART AUTO OUTREACH TAB ── */}
        <TabsContent value="smart" className="space-y-4 mt-4">

          {/* Today Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Runs Today", value: todayStats?.totalRuns ?? 0, icon: <Zap className="w-4 h-4 text-orange-400" /> },
              { label: "Scraped", value: todayStats?.totalScraped ?? 0, icon: <Building2 className="w-4 h-4 text-blue-400" /> },
              { label: "Emails Sent", value: todayStats?.totalEmailSent ?? 0, icon: <Mail className="w-4 h-4 text-green-400" /> },
              { label: "WhatsApp Ready", value: todayStats?.totalWhatsappSent ?? 0, icon: <Phone className="w-4 h-4 text-emerald-400" /> },
            ].map(s => (
              <Card key={s.label} className="bg-card border-border">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
                  <div className="text-2xl font-bold">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* City/State Config */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Today's Target Location</CardTitle>
                  <CardDescription>Set which city &amp; state to scrape and outreach today. Change it every morning when you log in.</CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{smartEnabled ? "Enabled" : "Paused"}</span>
                  <Switch
                    checked={smartEnabled}
                    onCheckedChange={v => {
                      setSmartEnabled(v);
                      updateSmartConfig.mutate({ targetCity: smartCity, targetState: smartState, isEnabled: v, contactMethod });
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label className="text-xs mb-1.5 block">City</Label>
                  <Input
                    placeholder="e.g. Hyderabad"
                    value={smartCity}
                    onChange={e => setSmartCity(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs mb-1.5 block">State</Label>
                  <Select value={smartState} onValueChange={setSmartState}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs mb-1.5 block">Contact Method</Label>
                  <Select value={contactMethod} onValueChange={v => setContactMethod(v as "email" | "whatsapp" | "both")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">📧📱 Email + WhatsApp</SelectItem>
                      <SelectItem value="email">📧 Email Only</SelectItem>
                      <SelectItem value="whatsapp">📱 WhatsApp Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => updateSmartConfig.mutate({ targetCity: smartCity, targetState: smartState, isEnabled: smartEnabled, contactMethod })}
                    disabled={updateSmartConfig.isPending || !smartCity || !smartState}
                    className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
                  >
                    {updateSmartConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Location"}
                  </Button>
                </div>
              </div>
              {smartConfigQuery.data && (
                <p className="text-xs text-muted-foreground mt-2">
                  Currently targeting: <span className="text-foreground font-medium">{smartConfigQuery.data.targetCity}, {smartConfigQuery.data.targetState}</span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Daily Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Daily Schedule — 5 Runs/Day</CardTitle>
              <CardDescription>Each run scrapes a different business type, filters Solar Score 70+, and sends personalised email + WhatsApp with your bot link</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SLOT_SCHEDULE.map(s => (
                  <div key={s.slot} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                        {s.slot}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.time} IST</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs text-green-400 border-green-500/30 bg-green-500/10 shrink-0">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-blue-400 font-medium">How it works</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Each run: scrapes up to 20 businesses → calculates Solar Score → sends email (if available) + logs WhatsApp message (if phone available) → marks as contacted. Bot link included in every message so businesses can get their estimate instantly.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Run History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Run History</CardTitle>
              <CardDescription>Last 50 auto outreach runs</CardDescription>
            </CardHeader>
            <CardContent>
              {runsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No runs yet — first run fires at 8:00 AM IST</p>
                  <p className="text-xs mt-1 opacity-60">Make sure you've set your city &amp; state above</p>
                </div>
              ) : (
                <>
                  <RunBusinessesModal runId={selectedRunId} open={showBizModal} onClose={() => setShowBizModal(false)} />
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {runs.map((run: any) => (
                      <div key={run.id} className="p-3 rounded-lg border border-border bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            {run.status === "completed"
                              ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                              : run.status === "failed"
                              ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                              : <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />}
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{run.businessType}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {run.targetCity}, {run.targetState} · {new Date(run.startedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                Scraped: <span className="text-foreground font-medium">{run.scrapedCount || 0}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Emails: <span className="text-green-400 font-medium">{run.emailSentCount || 0}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => { setSelectedRunId(run.id); setShowBizModal(true); }}
                            >
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── OVERVIEW TAB (legacy) ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today's Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalSent || 0}</div>
                <p className="text-xs text-gray-500 mt-1">Scheduled for 10:00 AM</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalDelivered || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Replies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics?.totalReplied || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Interested</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{analytics?.totalInterested || 0}</div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Campaign Status</CardTitle>
              <CardDescription>Daily automated outreach to verified Telangana businesses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Campaign Active</p>
                    <p className="text-sm text-gray-600">Sending 30 messages daily at 10:00 AM</p>
                  </div>
                </div>
                <Badge className="bg-green-600">ACTIVE</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SETTINGS TAB (legacy) ── */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Configuration</CardTitle>
              <CardDescription>Customize your automated outreach settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>State</Label>
                  <Input value={formData.state} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Minimum Rating</Label>
                  <Input type="number" step="0.1" value={formData.minRating}
                    onChange={(e) => setFormData({ ...formData, minRating: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contacts Per Day</Label>
                  <Input type="number" value={formData.contactsPerDay}
                    onChange={(e) => setFormData({ ...formData, contactsPerDay: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Schedule Time (HH:MM)</Label>
                  <Input type="time" value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Your WhatsApp Number (for alerts)</Label>
                <Input placeholder="+91 XXXXX XXXXX" value={formData.adminPhoneNumber}
                  onChange={(e) => setFormData({ ...formData, adminPhoneNumber: e.target.value })} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button onClick={configId ? handleUpdateConfig : handleCreateConfig}
                  disabled={createConfigMutation.isPending || updateConfigMutation.isPending}>
                  {configId ? "Update Settings" : "Create Campaign"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TODAY'S OUTREACH TAB ── */}
        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Outreach ({todayRecords.length})</CardTitle>
              <CardDescription>Messages scheduled for today</CardDescription>
            </CardHeader>
            <CardContent>
              {todayRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No outreach scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {todayRecords.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{record.businessName}</p>
                        <p className="text-sm text-gray-600">{record.businessType}</p>
                      </div>
                      <Badge variant={record.status === "sent" ? "default" : "secondary"}>
                        {record.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REPLIES TAB ── */}
        <TabsContent value="replies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Replies ({replies.length})</CardTitle>
              <CardDescription>Businesses that responded to your outreach</CardDescription>
            </CardHeader>
            <CardContent>
              {replies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No replies yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {replies.map((reply: any) => (
                    <div key={reply.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{reply.businessName}</p>
                          <p className="text-sm text-gray-600">{reply.ownerName}</p>
                        </div>
                        <Badge className="bg-blue-600">REPLIED</Badge>
                      </div>
                      <p className="text-sm bg-gray-50 p-2 rounded">{reply.replyText}</p>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleReplyStatusChange(reply.id, "interested")}>
                          Interested
                        </Button>
                        <Button size="sm" variant="outline"
                          onClick={() => handleReplyStatusChange(reply.id, "not_interested")}>
                          Not Interested
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
