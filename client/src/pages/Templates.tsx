import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Plus, Mail, MessageSquare, Trash2, Zap, Copy, Edit } from "lucide-react";
import { useState } from "react";

export default function Templates() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [channelFilter, setChannelFilter] = useState("all");
  const templates = trpc.templates.list.useQuery(channelFilter !== "all" ? { channel: channelFilter } : undefined);
  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => { templates.refetch(); toast.success("Template deleted"); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Reusable message templates for outreach</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="solar-gradient text-black">
              <Plus className="w-4 h-4 mr-1" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <CreateTemplateForm onSuccess={() => { setShowCreateDialog(false); templates.refetch(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        {["all", "email", "sms", "whatsapp"].map(ch => (
          <Button
            key={ch}
            variant={channelFilter === ch ? "default" : "outline"}
            size="sm"
            onClick={() => setChannelFilter(ch)}
            className={channelFilter === ch ? "solar-gradient text-black" : ""}
          >
            {ch === "all" ? "All" : ch === "email" ? "Email" : ch === "sms" ? "SMS" : "WhatsApp"}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card h-40 animate-pulse" />
          ))
        ) : templates.data?.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create message templates for quick outreach.</p>
          </div>
        ) : (
          templates.data?.map((template: any) => (
            <div key={template.id} className="stat-card space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`channel-badge channel-${template.channel}`}>
                    {template.channel === "email" ? <Mail className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                    {template.channel}
                  </span>
                  <h3 className="font-semibold text-sm">{template.name}</h3>
                </div>
              </div>
              {template.subject && (
                <p className="text-xs text-muted-foreground">Subject: {template.subject}</p>
              )}
              <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{template.body}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                  navigator.clipboard.writeText(template.body);
                  toast.success("Copied to clipboard");
                }}>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => {
                  if (confirm("Delete this template?")) deleteTemplate.mutate({ id: template.id });
                }}>
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreateTemplateForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => { toast.success("Template created"); onSuccess(); },
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
        <Label className="text-xs">Template Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} className="bg-card mt-1" placeholder="e.g., Solar Savings Intro" />
      </div>
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
          <Label className="text-xs">Message Body *</Label>
          <Button type="button" variant="ghost" size="sm" className="text-xs text-primary h-6"
            onClick={() => generateTemplate.mutate({ channel, purpose: name || "solar outreach" })}
            disabled={generateTemplate.isPending}
          >
            <Zap className="w-3 h-3 mr-1" />
            {generateTemplate.isPending ? "Generating..." : "AI Generate"}
          </Button>
        </div>
        <Textarea value={body} onChange={e => setBody(e.target.value)} className="bg-card mt-1 min-h-[120px]" placeholder="Write your template..." />
      </div>
      <p className="text-xs text-muted-foreground">
        Variables: {"{{firstName}}"}, {"{{lastName}}"}, {"{{monthlyBill}}"}, {"{{estimatedSavings}}"}, {"{{city}}"}, {"{{state}}"}
      </p>
      <Button className="w-full solar-gradient text-black"
        onClick={() => {
          if (!name.trim() || !body.trim()) { toast.error("Name and body are required"); return; }
          createTemplate.mutate({ name, channel, subject: subject || undefined, body });
        }}
        disabled={createTemplate.isPending}
      >
        {createTemplate.isPending ? "Creating..." : "Create Template"}
      </Button>
    </div>
  );
}
