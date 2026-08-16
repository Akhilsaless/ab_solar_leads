import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Users, CalendarDays, ArrowRight, Building2, X } from "lucide-react";
import { toast } from "sonner";

const number = (value: unknown) => Number(value || 0);

export default function Campaigns() {
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const campaigns = trpc.campaignIntelligence.listCampaigns.useQuery(undefined, { staleTime: 15_000 });
  const clients = trpc.campaignIntelligence.listClients.useQuery(undefined, { staleTime: 30_000 });
  const utils = trpc.useUtils();

  const createClient = trpc.campaignIntelligence.createClient.useMutation({
    onSuccess: () => { utils.campaignIntelligence.listClients.invalidate(); setShowClientForm(false); toast.success("Client created"); },
    onError: (error) => toast.error(error.message),
  });
  const createCampaign = trpc.campaignIntelligence.createCampaign.useMutation({
    onSuccess: () => { utils.campaignIntelligence.listCampaigns.invalidate(); setShowCampaignForm(false); toast.success("Campaign created as draft"); },
    onError: (error) => toast.error(error.message),
  });

  const list = campaigns.data || [];
  const active = list.filter((campaign: any) => campaign.status === "active").length;
  const accepted = list.reduce((total: number, campaign: any) => total + number(campaign.acceptedCount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">North Star workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track delivery from real lead evidence to client acceptance and revenue.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowClientForm(true)}><Building2 className="mr-2 h-4 w-4" />Add client</Button>
          <Button onClick={() => setShowCampaignForm(true)}><Plus className="mr-2 h-4 w-4" />New campaign</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Campaigns" value={list.length} icon={Target} />
        <Metric label="Active campaigns" value={active} icon={CalendarDays} />
        <Metric label="Accepted lead deliveries" value={accepted} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign delivery funnel</CardTitle>
          <CardDescription>Counts are only shown when real campaign records exist. Create a draft to define the client requirement and target.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.isLoading ? <div className="h-32 animate-pulse rounded-xl bg-muted" /> : list.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <Target className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No campaigns yet</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Create your first client campaign. The application will not invent targets, acceptance rates, or revenue.</p>
              <Button className="mt-4" onClick={() => setShowCampaignForm(true)}>Create campaign</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((campaign: any) => <CampaignRow key={campaign.id} campaign={campaign} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {showClientForm && <ClientForm onClose={() => setShowClientForm(false)} onSubmit={(value) => createClient.mutate(value)} pending={createClient.isPending} />}
      {showCampaignForm && <CampaignForm clients={clients.data || []} onClose={() => setShowCampaignForm(false)} onSubmit={(value) => createCampaign.mutate(value)} pending={createCampaign.isPending} />}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-4 w-4 text-primary" /></div><div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function CampaignRow({ campaign }: { campaign: any }) {
  const stages = [
    ["Generated", number(campaign.generatedCount)], ["Valid", number(campaign.validatedCount)], ["Qualified", number(campaign.qualifiedCount)],
    ["Interested", number(campaign.interestedCount)], ["Appts", number(campaign.appointmentCount)], ["Accepted", number(campaign.acceptedCount)],
  ];
  const accepted = number(campaign.acceptedCount);
  const delivered = number(campaign.deliveredCount) + accepted + number(campaign.rejectedCount);
  const acceptanceRate = delivered ? Math.round((accepted / delivered) * 100) : null;
  return (
    <div className="rounded-xl border p-4 transition-colors hover:bg-muted/30">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{campaign.name}</p><Badge variant={campaign.status === "active" ? "default" : "secondary"}>{campaign.status}</Badge></div>
          <p className="mt-1 text-sm text-muted-foreground">{campaign.clientName || "No client selected"} · {campaign.industry || "Industry not set"} · Target: {number(campaign.targetLeadCount)} leads / {number(campaign.appointmentTarget)} appointments</p>
        </div>
        <div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-semibold">{acceptanceRate === null ? "—" : `${acceptanceRate}%`}</p><p className="text-xs text-muted-foreground">Client acceptance</p></div><Link href={`/campaigns/${campaign.id}`}><Button size="sm">Open workflow<ArrowRight className="ml-2 h-4 w-4" /></Button></Link></div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">{stages.map(([label, value]) => <div key={String(label)} className="rounded-lg bg-muted/50 p-2"><p className="text-base font-semibold">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>)}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>{title}</CardTitle><Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button></CardHeader><CardContent>{children}</CardContent></Card></div>;
}

function ClientForm({ onClose, onSubmit, pending }: { onClose: () => void; onSubmit: (value: any) => void; pending: boolean }) {
  const [form, setForm] = useState({ name: "", industry: "", contactName: "", contactEmail: "", contactPhone: "", notes: "" });
  return <Modal title="Add client" onClose={onClose}><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}><FormField label="Client name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required /><div className="grid gap-3 sm:grid-cols-2"><FormField label="Industry" value={form.industry} onChange={(value) => setForm({ ...form, industry: value })} /><FormField label="Client contact" value={form.contactName} onChange={(value) => setForm({ ...form, contactName: value })} /><FormField label="Contact email" type="email" value={form.contactEmail} onChange={(value) => setForm({ ...form, contactEmail: value })} /><FormField label="Contact phone" value={form.contactPhone} onChange={(value) => setForm({ ...form, contactPhone: value })} /></div><textarea className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" placeholder="Notes (optional)" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending}>{pending ? "Creating..." : "Create client"}</Button></div></form></Modal>;
}

function CampaignForm({ clients, onClose, onSubmit, pending }: { clients: any[]; onClose: () => void; onSubmit: (value: any) => void; pending: boolean }) {
  const [form, setForm] = useState({ name: "", description: "", clientId: "", industry: "", geography: "", leadRequirement: "", leadSource: "", targetLeadCount: "0", appointmentTarget: "0", campaignCost: "", startDate: "", endDate: "" });
  return <Modal title="Create outcome-tracked campaign" onClose={onClose}><form className="space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, clientId: form.clientId ? Number(form.clientId) : undefined, targetLeadCount: Number(form.targetLeadCount || 0), appointmentTarget: Number(form.appointmentTarget || 0), campaignCost: form.campaignCost ? Number(form.campaignCost) : undefined, startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined, endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined }); }}><FormField label="Campaign name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required /><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Client</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">No client yet</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div><FormField label="Industry" value={form.industry} onChange={(value) => setForm({ ...form, industry: value })} /><FormField label="Target geography" value={form.geography} onChange={(value) => setForm({ ...form, geography: value })} /><FormField label="Lead source" value={form.leadSource} onChange={(value) => setForm({ ...form, leadSource: value })} /><FormField label="Lead target" type="number" value={form.targetLeadCount} onChange={(value) => setForm({ ...form, targetLeadCount: value })} /><FormField label="Appointment target" type="number" value={form.appointmentTarget} onChange={(value) => setForm({ ...form, appointmentTarget: value })} /><FormField label="Campaign cost (₹, optional)" type="number" value={form.campaignCost} onChange={(value) => setForm({ ...form, campaignCost: value })} /><FormField label="Start date" type="datetime-local" value={form.startDate} onChange={(value) => setForm({ ...form, startDate: value })} /><FormField label="End date" type="datetime-local" value={form.endDate} onChange={(value) => setForm({ ...form, endDate: value })} /></div><textarea className="min-h-20 w-full rounded-md border bg-background p-3 text-sm" placeholder="Client requirement / qualification rules" value={form.leadRequirement} onChange={(event) => setForm({ ...form, leadRequirement: event.target.value })} /><textarea className="min-h-20 w-full rounded-md border bg-background p-3 text-sm" placeholder="Campaign description (optional)" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending}>{pending ? "Creating..." : "Create draft"}</Button></div></form></Modal>;
}

function FormField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div><label className="mb-1.5 block text-sm font-medium">{label}</label><Input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
