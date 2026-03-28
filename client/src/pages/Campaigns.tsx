import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Megaphone, Plus, Play, Pause, BarChart3, Mail, MessageSquare, Phone,
  Globe, Clock, Users, ChevronRight, Zap, Send
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  phone: Phone,
  multi: Globe,
};

export default function Campaigns() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [, setLocation] = useLocation();
  const campaigns = trpc.campaigns.list.useQuery();
  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => { campaigns.refetch(); toast.success("Campaign updated"); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Campaigns
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your outreach campaigns</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="solar-gradient text-black">
              <Plus className="w-4 h-4 mr-1" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <CreateCampaignForm onSuccess={() => { setShowCreateDialog(false); campaigns.refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="stat-card h-48 animate-pulse" />
          ))
        ) : campaigns.data?.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first outreach campaign to start converting leads.</p>
          </div>
        ) : (
          campaigns.data?.map((campaign: any) => {
            const ChannelIcon = CHANNEL_ICONS[campaign.channel] || Globe;
            const totalSent = campaign.sentCount || 0;
            const totalResponded = campaign.respondedCount || 0;
            const responseRate = totalSent > 0 ? ((totalResponded / totalSent) * 100).toFixed(1) : "0";

            return (
              <div key={campaign.id} className="stat-card space-y-4 group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center channel-${campaign.channel}`}>
                      <ChannelIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{campaign.name}</h3>
                      <span className={`status-badge status-${campaign.status === "active" ? "qualified" : campaign.status === "completed" ? "converted" : campaign.status === "paused" ? "contacted" : "new"}`}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                </div>

                {campaign.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-lg font-bold">{campaign.targetLeadCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Targets</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{totalSent}</p>
                    <p className="text-[10px] text-muted-foreground">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-primary">{responseRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Response</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {campaign.status === "draft" && (
                    <Button size="sm" className="flex-1 solar-gradient text-black" onClick={() => setLocation(`/campaigns/${campaign.id}`)}>
                      <Play className="w-3 h-3 mr-1" /> Launch
                    </Button>
                  )}
                  {campaign.status === "active" && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => updateCampaign.mutate({ id: campaign.id, status: "paused" })}>
                      <Pause className="w-3 h-3 mr-1" /> Pause
                    </Button>
                  )}
                  {campaign.status === "paused" && (
                    <Button size="sm" className="flex-1 solar-gradient text-black" onClick={() => updateCampaign.mutate({ id: campaign.id, status: "active" })}>
                      <Play className="w-3 h-3 mr-1" /> Resume
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setLocation(`/campaigns/${campaign.id}`)}>
                    <BarChart3 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CreateCampaignForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: () => { toast.success("Campaign created"); onSuccess(); },
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
        toast.success("Template generated by AI");
      }
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Campaign Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} className="bg-card mt-1" placeholder="e.g., Summer Solar Promo" />
      </div>
      <div>
        <Label className="text-xs">Description</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-card mt-1" placeholder="Brief description..." />
      </div>
      <div>
        <Label className="text-xs">Channel</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="bg-card mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="multi">Multi-Channel</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(channel === "email" || channel === "multi") && (
        <div>
          <Label className="text-xs">Subject Line</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} className="bg-card mt-1" />
        </div>
      )}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Message Template</Label>
          <Button type="button" variant="ghost" size="sm" className="text-xs text-primary h-6"
            onClick={() => generateTemplate.mutate({ channel, purpose: name || "solar outreach" })}
            disabled={generateTemplate.isPending}
          >
            <Zap className="w-3 h-3 mr-1" />
            {generateTemplate.isPending ? "Generating..." : "AI Generate"}
          </Button>
        </div>
        <Textarea value={body} onChange={e => setBody(e.target.value)} className="bg-card mt-1 min-h-[100px]" placeholder="Write your message or use AI..." />
      </div>
      <Button
        className="w-full solar-gradient text-black"
        onClick={() => {
          if (!name.trim()) { toast.error("Campaign name is required"); return; }
          createCampaign.mutate({
            name,
            description,
            channel,
            steps: body.trim() ? [{ channel, subject: subject || undefined, body }] : undefined,
          });
        }}
        disabled={createCampaign.isPending}
      >
        {createCampaign.isPending ? "Creating..." : "Create Campaign"}
      </Button>
    </div>
  );
}
