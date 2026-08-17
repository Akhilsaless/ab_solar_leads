import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User, Building2, Bot, Copy, ExternalLink, MessageCircle, Linkedin, ShieldCheck, Gauge, FlaskConical } from "lucide-react";
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
    whatsappNumber: "", linkedinUrl: "",
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

      <AiGatewayPanel />

      <Button className="w-full solar-gradient text-black font-semibold" onClick={() => updateAgency.mutate(form)} disabled={updateAgency.isPending}>
        {updateAgency.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

function AiGatewayPanel() {
  const utils = trpc.useUtils();
  const gateway = trpc.aiGateway.getDashboard.useQuery();
  const catalog = trpc.aiGateway.catalog.useQuery();
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [isFreeTier, setIsFreeTier] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [priority, setPriority] = useState("100");
  const [playgroundPrompt, setPlaygroundPrompt] = useState("Reply with one sentence confirming the provider is available.");

  const selectedPreset = (catalog.data || []).find((item: any) => item.id === provider) as any;
  const selectedConnection = (gateway.data?.connections || []).find((item: any) => item.provider === provider) as any;
  const models = trpc.aiGateway.providerModels.useQuery({ provider: provider as any }, { enabled: Boolean(provider) });

  useEffect(() => {
    if (!selectedPreset) return;
    setAccountId(selectedConnection?.accountId || "");
    setBaseUrl(selectedConnection?.baseUrl || selectedPreset.defaultBaseUrl || "");
    setDefaultModel(selectedConnection?.defaultModel || selectedPreset.defaultModel || "");
    setIsFreeTier(selectedConnection?.isFreeTier ?? Boolean(selectedPreset.staticModels?.some((model: any) => model.isFree)));
    setIsEnabled(selectedConnection?.isEnabled ?? false);
    setPriority(String(selectedConnection?.priority ?? 100));
    setApiKey("");
  }, [provider, selectedPreset?.defaultBaseUrl, selectedPreset?.defaultModel, selectedConnection?.id]);

  const refresh = () => {
    gateway.refetch();
    models.refetch();
  };
  const saveProvider = trpc.aiGateway.saveProvider.useMutation({
    onSuccess: () => { toast.success("Provider configuration saved securely. Test it before enabling live routing."); refresh(); setApiKey(""); },
    onError: (error: any) => toast.error(error.message),
  });
  const testProvider = trpc.aiGateway.testProvider.useMutation({
    onSuccess: (result) => { toast.success(`Connection validated in ${result.latencyMs} ms. ${result.models.length} model(s) available.`); refresh(); },
    onError: (error: any) => toast.error(error.message),
  });
  const disconnectProvider = trpc.aiGateway.disconnectProvider.useMutation({
    onSuccess: () => { toast.success("Provider disconnected and encrypted credential removed."); refresh(); },
    onError: (error: any) => toast.error(error.message),
  });
  const updateGateway = trpc.aiGateway.updateSettings.useMutation({ onSuccess: () => { toast.success("AI routing policy saved."); refresh(); }, onError: (error: any) => toast.error(error.message) });
  const playground = trpc.aiGateway.playground.useMutation({ onError: (error: any) => toast.error(error.message) });

  const saveSelected = () => {
    if (!selectedPreset) return;
    saveProvider.mutate({
      provider: provider as any,
      ...(provider === "builtin" ? {} : { apiKey }),
      ...(provider === "cloudflare" ? { accountId } : {}),
      ...(provider !== "builtin" && provider !== "cloudflare" ? { baseUrl } : {}),
      defaultModel,
      isFreeTier,
      isEnabled,
      priority: Number(priority) || 100,
    });
  };

  const settings = gateway.data?.settings as any;
  const connectionState = selectedConnection?.status || "not_connected";
  const statusTone = connectionState === "connected" ? "text-emerald-400" : connectionState === "configuration_required" ? "text-amber-400" : connectionState === "error" ? "text-red-400" : "text-muted-foreground";

  return (
    <Card className="border-primary/25">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Integrations · AI Providers</CardTitle>
        <p className="text-sm text-muted-foreground">The AI Gateway keeps provider credentials encrypted server-side, routes Klaus through one normalized service, and never exposes saved secret values. Normal users only receive a fast answer—not provider complexity.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricMini label="Connected" value={String((gateway.data?.connections || []).filter((item: any) => item.status === "connected").length)} />
          <MetricMini label="Requests today" value={String((gateway.data?.usage || []).reduce((sum: number, item: any) => sum + Number(item.requestsToday || 0), 0))} />
          <MetricMini label="Fallbacks" value={String((gateway.data?.usage || []).reduce((sum: number, item: any) => sum + Number(item.fallbackCount || 0), 0))} />
          <MetricMini label="Routing" value={String(settings?.routingMode || "auto").replaceAll("_", " ")} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Provider connections</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(catalog.data || []).map((item: any) => {
              const existing = (gateway.data?.connections || []).find((connection: any) => connection.provider === item.id) as any;
              const selected = item.id === provider;
              return <button key={item.id} type="button" onClick={() => setProvider(item.id)} className={`rounded-xl border p-3 text-left transition ${selected ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/50"}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">{item.label}</span><span className={`text-xs ${existing?.status === "connected" ? "text-emerald-400" : existing?.status === "error" ? "text-red-400" : "text-muted-foreground"}`}>{providerStateLabel(existing?.status)}</span></div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.purpose}</p>
              </button>;
            })}
          </div>
        </div>

        {selectedPreset && <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{selectedPreset.label}</p><p className="text-xs text-muted-foreground">Connection type: {selectedPreset.connectionType.replaceAll("_", " ")} · <span className={statusTone}>{providerStateLabel(connectionState)}</span></p></div><span className="text-xs text-muted-foreground">Health: {selectedConnection?.healthStatus || "unknown"}</span></div>
          {provider !== "builtin" && <div className="grid gap-3 sm:grid-cols-2">
            {selectedPreset.credentialFields?.some((field: any) => field.key === "apiKey") && <div className="sm:col-span-2"><label className="text-sm font-medium mb-1.5 block">{selectedConnection?.credentialConfigured ? "Replace credential" : selectedPreset.credentialFields.find((field: any) => field.key === "apiKey")?.label}</label><input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={selectedConnection?.credentialHint || "Enter once — it will be encrypted and masked after save"} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" /><p className="mt-1 text-xs text-muted-foreground">The value is sent only to the server to be encrypted. It is never returned or shown after saving.</p></div>}
            {provider === "cloudflare" && <Field label="Cloudflare Account ID" value={accountId} onChange={setAccountId} />}
            {provider !== "cloudflare" && <Field label="Provider Base URL" value={baseUrl} onChange={setBaseUrl} />}
            <div><label className="text-sm font-medium mb-1.5 block">Default model</label><input list="provider-models" value={defaultModel} onChange={(event) => setDefaultModel(event.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" placeholder="Choose or enter a model ID" /><datalist id="provider-models">{(models.data || []).map((model: any) => <option key={model.modelId || model.id} value={model.modelId || model.id}>{model.displayName || model.modelId || model.id}</option>)}</datalist></div>
            <Field label="Priority (lower routes first)" value={priority} onChange={setPriority} type="number" />
          </div>}
          <div className="flex flex-wrap gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={isFreeTier} onChange={(event) => setIsFreeTier(event.target.checked)} /> Prefer as free-tier capable</label><label className="flex items-center gap-2"><input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} /> Eligible for live routing</label></div>
          {selectedConnection?.lastErrorMessage && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">Latest provider issue: {selectedConnection.lastErrorMessage}</p>}
          <div className="flex flex-wrap gap-2"><Button size="sm" onClick={saveSelected} disabled={saveProvider.isPending}>{saveProvider.isPending ? "Saving…" : "Configure securely"}</Button><Button size="sm" variant="outline" onClick={() => testProvider.mutate({ provider: provider as any })} disabled={!selectedConnection?.credentialConfigured || testProvider.isPending}>{testProvider.isPending ? "Testing…" : "Test connection"}</Button>{selectedConnection?.credentialConfigured && provider !== "builtin" && <Button size="sm" variant="outline" className="text-destructive" onClick={() => disconnectProvider.mutate({ provider: provider as any })}>Disconnect</Button>}</div>
        </div>}

        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /><p className="font-medium">Gateway routing and cost protection</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><label className="text-sm font-medium mb-1.5 block">Routing mode</label><select value={settings?.routingMode || "auto"} onChange={(event) => updateGateway.mutate({ routingMode: event.target.value as any, freeModelsOnly: Boolean(settings?.freeModelsOnly), allowPaidFallback: Boolean(settings?.allowPaidFallback), monthlyBudgetInr: Number(settings?.monthlyBudgetInr || 0), warningThresholdPercent: Number(settings?.warningThresholdPercent || 70), criticalThresholdPercent: Number(settings?.criticalThresholdPercent || 90), providerPriority: settings?.providerPriority || [], featurePolicies: settings?.featurePolicies || {} })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"><option value="auto">Auto — capability and health aware</option><option value="fastest">Fastest available</option><option value="free_first">Free first</option><option value="best_quality">Best configured quality</option><option value="manual">Manual selection only</option></select></div><Field label="Monthly paid-AI budget (₹)" value={String(settings?.monthlyBudgetInr || 0)} onChange={(value) => updateGateway.mutate({ routingMode: settings?.routingMode || "auto", freeModelsOnly: Boolean(settings?.freeModelsOnly), allowPaidFallback: Boolean(settings?.allowPaidFallback), monthlyBudgetInr: Number(value || 0), warningThresholdPercent: Number(settings?.warningThresholdPercent || 70), criticalThresholdPercent: Number(settings?.criticalThresholdPercent || 90), providerPriority: settings?.providerPriority || [], featurePolicies: settings?.featurePolicies || {} })} type="number" /></div>
          <div className="flex flex-wrap gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settings?.freeModelsOnly)} onChange={(event) => updateGateway.mutate({ routingMode: settings?.routingMode || "auto", freeModelsOnly: event.target.checked, allowPaidFallback: Boolean(settings?.allowPaidFallback), monthlyBudgetInr: Number(settings?.monthlyBudgetInr || 0), warningThresholdPercent: Number(settings?.warningThresholdPercent || 70), criticalThresholdPercent: Number(settings?.criticalThresholdPercent || 90), providerPriority: settings?.providerPriority || [], featurePolicies: settings?.featurePolicies || {} })} /> Free models only</label><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settings?.allowPaidFallback)} onChange={(event) => updateGateway.mutate({ routingMode: settings?.routingMode || "auto", freeModelsOnly: Boolean(settings?.freeModelsOnly), allowPaidFallback: event.target.checked, monthlyBudgetInr: Number(settings?.monthlyBudgetInr || 0), warningThresholdPercent: Number(settings?.warningThresholdPercent || 70), criticalThresholdPercent: Number(settings?.criticalThresholdPercent || 90), providerPriority: settings?.providerPriority || [], featurePolicies: settings?.featurePolicies || {} })} /> Allow paid fallback</label></div>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-primary" /><p className="font-medium">Admin AI Playground</p></div>
          <textarea value={playgroundPrompt} onChange={(event) => setPlaygroundPrompt(event.target.value)} className="w-full min-h-[84px] rounded-lg bg-secondary px-3 py-2 text-sm border border-border" />
          <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" disabled={playground.isPending} onClick={() => playground.mutate({ provider: provider as any, model: defaultModel || undefined, prompt: playgroundPrompt, routingMode: settings?.routingMode || "auto" })}>{playground.isPending ? "Testing…" : "Run test"}</Button>{playground.data && <span className="text-xs text-muted-foreground">{playground.data.provider} · {playground.data.model} · {playground.data.latencyMs} ms</span>}</div>
          {playground.data && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-xs text-foreground">{playground.data.content}</pre>}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold capitalize">{value}</p></div>; }
function providerStateLabel(state?: string) { return ({ connected: "Connected", configuration_required: "Configuration Required", error: "Error", rate_limited: "Rate Limited", unavailable: "Unavailable", not_connected: "Not Connected" } as Record<string, string>)[state || "not_connected"] || "Not Connected"; }

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
