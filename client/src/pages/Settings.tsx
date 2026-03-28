import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User, Building2, Bot, Copy, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const { data: agency, isLoading } = trpc.agency.get.useQuery();
  const utils = trpc.useUtils();
  const updateAgency = trpc.agency.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved!");
      utils.agency.get.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    agencyName: "", phone: "", email: "", website: "", address: "",
    city: "", state: "", installationChargePerKw: "", marginPercent: "",
    botGreeting: "", botTone: "friendly", brandColor: "#F97316",
  });

  useEffect(() => {
    if (agency) {
      setForm({
        agencyName: agency.agencyName || "", phone: agency.phone || "",
        email: agency.email || "", website: agency.website || "",
        address: agency.address || "", city: agency.city || "",
        state: agency.state || "",
        installationChargePerKw: agency.installationChargePerKw || "8000",
        marginPercent: agency.marginPercent || "15",
        botGreeting: agency.botGreeting || "", botTone: agency.botTone || "friendly",
        brandColor: agency.brandColor || "#F97316",
      });
    }
  }, [agency]);

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-48 bg-secondary animate-pulse rounded-lg" />)}</div>;
  }

  const chatLink = agency ? `${window.location.origin}/chat/${agency.agencySlug}` : "";

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your agency and AI bot</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldDisplay label="Name" value={user?.name || "-"} />
            <FieldDisplay label="Email" value={user?.email || "-"} />
          </div>
          {chatLink && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Bot Chat Link</label>
              <div className="flex items-center gap-2">
                <input className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-mono" value={chatLink} readOnly />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(chatLink); toast.success("Copied!"); }}><Copy className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="outline" onClick={() => window.open(chatLink, "_blank")}><ExternalLink className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Agency Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Agency Name" value={form.agencyName} onChange={(v) => setForm({ ...form, agencyName: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          </div>
          <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Pricing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Installation ₹/kW" value={form.installationChargePerKw} onChange={(v) => setForm({ ...form, installationChargePerKw: v })} type="number" />
            <Field label="Margin %" value={form.marginPercent} onChange={(v) => setForm({ ...form, marginPercent: v })} type="number" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4" /> AI Bot</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Bot Tone</label>
              <select className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" value={form.botTone} onChange={(e) => setForm({ ...form, botTone: e.target.value })}>
                <option value="friendly">Friendly & Warm</option>
                <option value="professional">Professional</option>
                <option value="enthusiastic">Enthusiastic & Energetic</option>
                <option value="consultative">Consultative & Expert</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Brand Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="w-10 h-10 rounded-lg border border-border cursor-pointer" value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} />
                <input className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm" value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Custom Greeting</label>
            <textarea className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm min-h-[100px]" value={form.botGreeting} onChange={(e) => setForm({ ...form, botGreeting: e.target.value })} placeholder="Leave empty for default greeting..." />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full solar-gradient text-black font-semibold" onClick={() => updateAgency.mutate(form)} disabled={updateAgency.isPending}>
        {updateAgency.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <input type={type} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <div className="px-3 py-2 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">{value}</div>
    </div>
  );
}
