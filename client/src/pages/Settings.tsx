import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User, Building2, Bot, Copy, ExternalLink, MessageCircle, Linkedin } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const KLAUS_PROVIDER_PRESETS = {
  builtin: { label: "Built-in model", baseUrl: "", model: "" },
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  groq: { label: "Groq (OpenAI-compatible)", baseUrl: "https://api.groq.com/openai/v1", model: "" },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "" },
  together: { label: "Together AI", baseUrl: "https://api.together.ai/v1", model: "" },
  custom: { label: "Custom / Ollama-compatible HTTPS endpoint", baseUrl: "", model: "" },
} as const;

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
    whatsappNumber: "", linkedinUrl: "",
  });
  const [klausPreset, setKlausPreset] = useState<keyof typeof KLAUS_PROVIDER_PRESETS>("builtin");
  const [klausBaseUrl, setKlausBaseUrl] = useState("");
  const [klausModel, setKlausModel] = useState("");
  const klausProviderQuery = trpc.copilot.getProviderConfig.useQuery();
  const updateKlausProvider = trpc.copilot.updateProviderConfig.useMutation({
    onSuccess: () => { klausProviderQuery.refetch(); toast.success("Klaus provider saved"); },
    onError: (err: any) => toast.error(err.message),
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
        whatsappNumber: (agency as any).whatsappNumber || "",
        linkedinUrl: (agency as any).linkedinUrl || "",
      });
    }
  }, [agency]);

  useEffect(() => {
    if (!klausProviderQuery.data) return;
    if (klausProviderQuery.data.provider !== "openai_compatible") {
      setKlausPreset("builtin"); setKlausBaseUrl(""); setKlausModel(""); return;
    }
    const baseUrl = klausProviderQuery.data.externalBaseUrl || "";
    const preset = (Object.entries(KLAUS_PROVIDER_PRESETS).find(([, value]) => value.baseUrl === baseUrl)?.[0] || "custom") as keyof typeof KLAUS_PROVIDER_PRESETS;
    setKlausPreset(preset); setKlausBaseUrl(baseUrl); setKlausModel(klausProviderQuery.data.externalModel || "");
  }, [klausProviderQuery.data]);

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
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-green-400" />WhatsApp number for agent handoff (customers connect here)</p>
            <Field label="WhatsApp Number (with country code, e.g. 919876543210)" value={form.whatsappNumber} onChange={(v) => setForm({ ...form, whatsappNumber: v })} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5 text-blue-400" />LinkedIn company page (used in scraper outreach)</p>
            <Field label="LinkedIn URL (e.g. https://linkedin.com/company/sales-squad)" value={form.linkedinUrl} onChange={(v) => setForm({ ...form, linkedinUrl: v })} />
          </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bot className="w-4 h-4" /> Integrations · Klaus AI Engine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Select the provider Klaus uses. Providers may require their own account, key, and model access. Your key is kept server-side and is never displayed in the application.</p>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Provider</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
              value={klausPreset}
              onChange={(event) => {
                const preset = event.target.value as keyof typeof KLAUS_PROVIDER_PRESETS;
                setKlausPreset(preset);
                setKlausBaseUrl(KLAUS_PROVIDER_PRESETS[preset].baseUrl);
                setKlausModel(KLAUS_PROVIDER_PRESETS[preset].model);
              }}
            >
              {Object.entries(KLAUS_PROVIDER_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </div>
          {klausPreset !== "builtin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="OpenAI-compatible Base URL" value={klausBaseUrl} onChange={setKlausBaseUrl} />
              <Field label="Model ID" value={klausModel} onChange={setKlausModel} />
              <p className="sm:col-span-2 text-xs text-muted-foreground">Use an HTTPS endpoint and a model ID available in your provider account. For a self-hosted endpoint, expose it securely over public HTTPS.</p>
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/50 pt-3">
            <p className="text-xs text-muted-foreground">When you are ready, add <code>KLAUS_EXTERNAL_API_KEY</code> in secure project secrets. Do not paste a key into this page.</p>
            <Button
              size="sm"
              disabled={updateKlausProvider.isPending}
              onClick={() => updateKlausProvider.mutate(klausPreset === "builtin"
                ? { provider: "builtin" }
                : { provider: "openai_compatible", externalBaseUrl: klausBaseUrl, externalModel: klausModel })}
            >{updateKlausProvider.isPending ? "Saving..." : "Save Klaus provider"}</Button>
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
