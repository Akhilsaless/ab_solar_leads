import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, Phone, MessageSquare, MapPin,
  Clock, Zap, Star, Send, FileText, Activity, User,
  Calendar, DollarSign, Home as HomeIcon, Sun, Wrench
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const leadId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);

  const lead = trpc.leads.getById.useQuery({ id: leadId });
  const activities = trpc.activity.list.useQuery({ leadId });
  const outreachMessages = trpc.outreach.list.useQuery({ leadId });
  const updateLead = trpc.leads.update.useMutation({
    onSuccess: () => { lead.refetch(); activities.refetch(); toast.success("Lead updated"); },
  });
  const addNote = trpc.activity.add.useMutation({
    onSuccess: () => { activities.refetch(); toast.success("Note added"); },
  });
  const scoreLead = trpc.ai.scoreLead.useMutation({
    onSuccess: (data) => { lead.refetch(); toast.success(`Score updated to ${data.score}`); },
  });

  const [noteText, setNoteText] = useState("");

  if (lead.isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!lead.data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Lead not found</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/leads")}>Back to Leads</Button>
      </div>
    );
  }

  const l = lead.data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {l.firstName?.[0]}{l.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold">{l.firstName} {l.lastName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {l.company && <span className="text-sm text-muted-foreground">{l.company}</span>}
                <span className={`status-badge status-${l.status}`}>{l.status}</span>
                <span className={`text-xs font-semibold priority-${l.priority}`}>{l.priority?.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => scoreLead.mutate({ leadId })} disabled={scoreLead.isPending}>
            <Star className="w-4 h-4 mr-1" /> {scoreLead.isPending ? "Scoring..." : "Re-Score"}
          </Button>
          <Dialog open={showOutreachDialog} onOpenChange={setShowOutreachDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="solar-gradient text-black">
                <Send className="w-4 h-4 mr-1" /> Send Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Send Outreach Message</DialogTitle></DialogHeader>
              <OutreachForm leadId={leadId} onSuccess={() => { setShowOutreachDialog(false); outreachMessages.refetch(); activities.refetch(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Score Bar */}
      <div className="stat-card flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Lead Score</span>
            <span className="text-lg font-bold text-primary">{l.leadScore}/100</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full solar-gradient rounded-full transition-all duration-500" style={{ width: `${l.leadScore || 0}%` }} />
          </div>
        </div>
        {l.estimatedSavings && (
          <div className="text-right pl-4 border-l border-border">
            <p className="text-xs text-muted-foreground">Est. Annual Savings</p>
            <p className="text-lg font-bold text-green-400">₹{Number(l.estimatedSavings).toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="outreach">Outreach</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="stat-card space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {l.email && <InfoRow icon={Mail} value={l.email} />}
                  {l.phone && <InfoRow icon={Phone} value={l.phone} />}
                  {l.whatsapp && <InfoRow icon={MessageSquare} value={l.whatsapp} />}
                  {l.propertyAddress && <InfoRow icon={MapPin} value={`${l.propertyAddress}, ${l.city || ""} ${l.state || ""} ${l.zipCode || ""}`} />}
                </div>
              </div>

              <div className="stat-card space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <HomeIcon className="w-4 h-4 text-primary" /> Property Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoItem icon={DollarSign} label="Monthly Bill" value={l.monthlyEnergyBill ? `₹${l.monthlyEnergyBill}` : "N/A"} />
                  <InfoItem icon={Wrench} label="Roof Condition" value={l.roofCondition || "N/A"} />
                  <InfoItem icon={Sun} label="Sun Exposure" value={l.sunExposure || "N/A"} />
                  <InfoItem icon={HomeIcon} label="Ownership" value={l.homeownershipType || "N/A"} />
                  <InfoItem icon={Calendar} label="Timeline" value={l.installationTimeline || "N/A"} />
                  <InfoItem icon={FileText} label="Source" value={l.source || "manual"} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="stat-card space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a note..."
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    className="bg-background"
                    onKeyDown={e => {
                      if (e.key === "Enter" && noteText.trim()) {
                        addNote.mutate({ leadId, activityType: "note_added", description: noteText });
                        setNoteText("");
                      }
                    }}
                  />
                  <Button size="sm" onClick={() => {
                    if (noteText.trim()) {
                      addNote.mutate({ leadId, activityType: "note_added", description: noteText });
                      setNoteText("");
                    }
                  }}>Add</Button>
                </div>
                <div className="space-y-3">
                  {activities.data?.map((a: any) => (
                    <div key={a.id} className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{a.description || a.activityType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!activities.data || activities.data.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="outreach" className="mt-4">
              <div className="stat-card space-y-3">
                {outreachMessages.data?.map((msg: any) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className={`channel-badge channel-${msg.channel}`}>
                      {msg.channel === "email" ? <Mail className="w-3 h-3" /> :
                       msg.channel === "sms" ? <MessageSquare className="w-3 h-3" /> :
                       msg.channel === "whatsapp" ? <MessageSquare className="w-3 h-3" /> :
                       <Phone className="w-3 h-3" />}
                      {msg.channel}
                    </div>
                    <div className="flex-1 min-w-0">
                      {msg.subject && <p className="text-sm font-medium">{msg.subject}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`status-badge status-${msg.status === "sent" ? "contacted" : "new"}`}>{msg.status}</span>
                        <span className="text-xs text-muted-foreground">
                          {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!outreachMessages.data || outreachMessages.data.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">No outreach messages yet</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="stat-card space-y-3">
            <h3 className="font-semibold text-sm">Update Status</h3>
            <Select value={l.status} onValueChange={(v) => updateLead.mutate({ id: leadId, status: v })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="stat-card space-y-3">
            <h3 className="font-semibold text-sm">Priority</h3>
            <Select value={l.priority} onValueChange={(v) => updateLead.mutate({ id: leadId, priority: v })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="stat-card space-y-2">
            <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
            {l.email && <a href={`mailto:${l.email}`} className="sidebar-link"><Mail className="w-4 h-4" /> Send Email</a>}
            {l.phone && <a href={`tel:${l.phone}`} className="sidebar-link"><Phone className="w-4 h-4" /> Call</a>}
            {l.whatsapp && <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noopener" className="sidebar-link"><MessageSquare className="w-4 h-4" /> WhatsApp</a>}
          </div>

          {l.notes && (
            <div className="stat-card space-y-2">
              <h3 className="font-semibold text-sm">Notes</h3>
              <p className="text-sm text-muted-foreground">{l.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, value }: { icon: any; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className="text-sm font-medium capitalize">{value}</p>
    </div>
  );
}

function OutreachForm({ leadId, onSuccess }: { leadId: number; onSuccess: () => void }) {
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const sendMessage = trpc.outreach.send.useMutation({
    onSuccess: () => { toast.success("Message sent"); onSuccess(); },
    onError: (err) => toast.error(err.message),
  });

  const generateTemplate = trpc.ai.generateTemplate.useMutation({
    onSuccess: (data) => {
      if (data.template) {
        const lines = data.template.split("\n");
        if (lines[0]?.startsWith("Subject: ")) {
          setSubject(lines[0].replace("Subject: ", ""));
          setBody(lines.slice(1).join("\n").trim());
        } else {
          setBody(data.template);
        }
        toast.success("Template generated");
      }
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Channel</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="bg-card mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {channel === "email" && (
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} className="bg-card mt-1" />
        </div>
      )}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Message</Label>
          <Button type="button" variant="ghost" size="sm" className="text-xs text-primary h-6"
            onClick={() => generateTemplate.mutate({ channel, purpose: "solar installation follow-up" })}
            disabled={generateTemplate.isPending}
          >
            <Zap className="w-3 h-3 mr-1" />
            {generateTemplate.isPending ? "Generating..." : "AI Generate"}
          </Button>
        </div>
        <Textarea value={body} onChange={e => setBody(e.target.value)} className="bg-card mt-1 min-h-[120px]" placeholder="Type your message or use AI to generate..." />
      </div>
      <p className="text-xs text-muted-foreground">
        Variables: {"{{firstName}}"}, {"{{lastName}}"}, {"{{monthlyBill}}"}, {"{{estimatedSavings}}"}, {"{{city}}"}
      </p>
      <Button className="w-full solar-gradient text-black"
        onClick={() => {
          if (!body.trim()) { toast.error("Message body is required"); return; }
          sendMessage.mutate({ leadId, channel, subject: subject || undefined, body });
        }}
        disabled={sendMessage.isPending}
      >
        <Send className="w-4 h-4 mr-2" />
        {sendMessage.isPending ? "Sending..." : "Send Message"}
      </Button>
    </div>
  );
}
