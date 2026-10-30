import FollowupPanel from "@/components/FollowupPanel";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User, Building2, Bot, Copy, ExternalLink, MessageCircle, Linkedin, ShieldCheck, Gauge, FlaskConical, Mail, Database, CheckCircle2, Save, Power, Pause, Play, OctagonAlert, KeyRound } from "lucide-react";
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

      <OperationsReadinessPanel />

      {Boolean((user as any)?.isPlatformOwner) && <PlatformCommunicationPanel />}

      <AiGatewayPanel />
      <FollowupPanel owner={Boolean((user as any)?.isPlatformOwner)} />

      <Button className="w-full solar-gradient text-black font-semibold" onClick={() => updateAgency.mutate(form)} disabled={updateAgency.isPending}>
        {updateAgency.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

function PlatformCommunicationPanel() {
  const status = trpc.platformCommunications.status.useQuery();
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [confirmed, setConfirmed] = useState(false);
  const [stopConfirmed, setStopConfirmed] = useState(false);
  const [email, setEmail] = useState({ provider: "SMTP", host: "", port: "587", secure: false, user: "", password: "", from: "", fromName: "Sales Squad", replyTo: "", eventWebhookSecret: "" });
  const [senderConfirmed, setSenderConfirmed] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testConfirmed, setTestConfirmed] = useState(false);
  const [whatsapp, setWhatsapp] = useState({ provider: "WhatsApp Business", phoneNumberId: "", businessAccountId: "", accessToken: "", webhookVerifyToken: "", webhookSignatureSecret: "", defaultTemplate: "" });
  const refresh = () => status.refetch();
  const saveEmail = trpc.platformCommunications.saveEmailConfiguration.useMutation({ onSuccess: () => { toast.success("Email configuration stored securely. Verify it before activation."); setEmail({ ...email, password: "", eventWebhookSecret: "" }); refresh(); }, onError: (error: any) => toast.error(error.message) });
  const saveWhatsapp = trpc.platformCommunications.saveWhatsAppConfiguration.useMutation({ onSuccess: () => { toast.success("WhatsApp configuration stored securely. A signed adapter is still required."); setWhatsapp({ ...whatsapp, accessToken: "", webhookVerifyToken: "", webhookSignatureSecret: "" }); refresh(); }, onError: (error: any) => toast.error(error.message) });
  const verifyEmail = trpc.platformCommunications.verifyEmail.useMutation({ onSuccess: () => { toast.success("SMTP verified. Sending remains OFF."); refresh(); }, onError: (error: any) => { toast.error(error.message); refresh(); } });
  const controlledEmailTest = trpc.platformCommunications.sendControlledEmailTest.useMutation({ onSuccess: () => { toast.success("Controlled test accepted by the verified SMTP provider. Automation remains OFF."); setTestRecipient(""); setTestConfirmed(false); refresh(); }, onError: (error: any) => { toast.error(error.message); refresh(); } });
  const eligibility = trpc.platformCommunications.setAgencyEligibility.useMutation({ onSuccess: () => { toast.success("Agency communication eligibility updated."); refresh(); }, onError: (error: any) => toast.error(error.message) });
  const verifyWhatsapp = trpc.platformCommunications.verifyWhatsApp.useMutation({ onError: (error: any) => { toast.error(error.message); refresh(); } });
  const setAutomation = trpc.platformCommunications.setAutomationState.useMutation({ onSuccess: () => { toast.success("Platform state updated."); refresh(); }, onError: (error: any) => toast.error(error.message) });
  const setEmergency = trpc.platformCommunications.setEmergencyStop.useMutation({ onSuccess: () => { toast.success("Emergency-stop state updated."); setStopConfirmed(false); refresh(); }, onError: (error: any) => toast.error(error.message) });
  const data = status.data as any;
  const current = data?.[channel] as any;
  const field = (label: string, value: string, onChange: (value: string) => void, type = "text", placeholder?: string) => <div><label className="mb-1 block text-xs font-medium">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></div>;
  return <Card className="border-amber-500/40"><CardHeader className="space-y-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-amber-500" /> Platform communication control</CardTitle><p className="text-sm text-muted-foreground">Super-admin only. Credentials are encrypted on the server, never returned, and cannot send until every prerequisite is explicitly satisfied.</p></CardHeader><CardContent className="space-y-4">
    {status.isLoading ? <div className="h-44 animate-pulse rounded-xl bg-secondary" /> : <>
      <div className={`rounded-xl border p-3 ${data?.emergencyStopActive ? "border-destructive/60 bg-destructive/10" : "border-emerald-500/40 bg-emerald-500/10"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 font-medium"><OctagonAlert className="h-4 w-4" /> Emergency stop: {data?.emergencyStopActive ? "ACTIVE" : "CLEARED"}</p><p className="mt-1 text-xs text-muted-foreground">Active blocks all automatic email/WhatsApp dispatches immediately and pauses running channels.</p></div><div className="flex items-center gap-2"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={stopConfirmed} onChange={(event) => setStopConfirmed(event.target.checked)} /> I understand</label><Button size="sm" variant={data?.emergencyStopActive ? "outline" : "destructive"} disabled={!stopConfirmed || setEmergency.isPending} onClick={() => setEmergency.mutate({ active: !data?.emergencyStopActive })}>{data?.emergencyStopActive ? "Clear stop" : "Activate stop"}</Button></div></div></div>
      <div className="flex flex-wrap gap-2">{(["email", "whatsapp"] as const).map((item) => <Button key={item} size="sm" variant={channel === item ? "default" : "outline"} onClick={() => { setChannel(item); setConfirmed(false); }}>{item === "email" ? <Mail className="mr-1.5 h-3.5 w-3.5" /> : <MessageCircle className="mr-1.5 h-3.5 w-3.5" />}{item === "email" ? "Email" : "WhatsApp"}</Button>)}</div>
      <div className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{channel === "email" ? "Email" : "WhatsApp"} operational state</p><p className="mt-1 text-xs text-muted-foreground">Provider: {current?.provider || "not configured"} · Credential status: {current?.configured ? "configured securely" : "not configured"}</p></div><div className="text-right"><p className="text-sm font-semibold uppercase">{current?.automationState || "off"}</p><p className="text-xs text-muted-foreground">{String(current?.status || "not configured").replaceAll("_", " ")}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={current?.automationState !== "running" || setAutomation.isPending} onClick={() => setAutomation.mutate({ channel, state: "paused" })}><Pause className="mr-1.5 h-3.5 w-3.5" />Pause</Button><Button size="sm" variant="outline" disabled={current?.automationState === "off" || setAutomation.isPending} onClick={() => setAutomation.mutate({ channel, state: "off" })}><Power className="mr-1.5 h-3.5 w-3.5" />Turn off</Button><Button size="sm" disabled={!confirmed || Boolean(data?.emergencyStopActive) || setAutomation.isPending} onClick={() => setAutomation.mutate({ channel, state: "running", legalReady: true })}><Play className="mr-1.5 h-3.5 w-3.5" />{current?.automationState === "paused" ? "Resume" : "Turn on"}</Button></div><label className="mt-3 flex gap-2 text-xs text-muted-foreground"><input className="mt-0.5" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I confirm consent/opt-out records, recipient segmentation, provider template approval, and legal prerequisites have been reviewed.</label></div>
      <div className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">Agency 1 eligibility</p><p className="mt-1 text-xs text-muted-foreground">This only arms the agency prerequisite. It cannot bypass provider verification, the global emergency stop, the outreach master, or the platform channel state.</p></div><span className="text-xs font-medium uppercase">{data?.agencyEligibility?.[channel] ? "armed" : "disarmed"}</span></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={Boolean(data?.agencyEligibility?.[channel]) || eligibility.isPending} onClick={() => eligibility.mutate({ channel, enabled: true })}>Arm {channel === "email" ? "email" : "WhatsApp"} eligibility</Button><Button size="sm" variant="outline" disabled={!data?.agencyEligibility?.[channel] || eligibility.isPending} onClick={() => eligibility.mutate({ channel, enabled: false })}>Disarm eligibility</Button></div><p className="mt-2 text-xs text-muted-foreground">Outreach master: {data?.agencyEligibility?.outreachMaster ? "ON" : "OFF"} · Scheduled follow-ups: {data?.agencyEligibility?.scheduledFollowUps ? "eligible" : "not eligible"}.</p></div>
      <div className="rounded-xl border border-border p-4"><div className="mb-3 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /><p className="font-medium">{channel === "email" ? "Email" : "WhatsApp"} configuration</p></div>{channel === "email" ? <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{field("SMTP provider", email.provider, (value) => setEmail({ ...email, provider: value }))}{field("SMTP host", email.host, (value) => setEmail({ ...email, host: value }))}{field("SMTP port", email.port, (value) => setEmail({ ...email, port: value }), "number")}{field("SMTP username", email.user, (value) => setEmail({ ...email, user: value }))}{field("SMTP password", email.password, (value) => setEmail({ ...email, password: value }), "password", "Enter once — never shown again")}{field("From address", email.from, (value) => setEmail({ ...email, from: value }), "email")}{field("From name", email.fromName, (value) => setEmail({ ...email, fromName: value }))}{field("Reply-to address", email.replyTo, (value) => setEmail({ ...email, replyTo: value }), "email")}</div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={email.secure} onChange={(event) => setEmail({ ...email, secure: event.target.checked })} /> Use TLS/SSL</label><label className="flex items-start gap-2 text-xs text-muted-foreground"><input className="mt-0.5" type="checkbox" checked={senderConfirmed} onChange={(event) => setSenderConfirmed(event.target.checked)} /> I confirm the From address belongs to Sales Squad or is an authorized sender identity with this SMTP provider.</label><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!senderConfirmed || saveEmail.isPending} onClick={() => saveEmail.mutate({ ...email, senderIdentityConfirmed: true })}>{saveEmail.isPending ? "Saving…" : "Save encrypted configuration"}</Button><Button size="sm" variant="outline" disabled={!current?.configured || verifyEmail.isPending} onClick={() => verifyEmail.mutate()}>{verifyEmail.isPending ? "Verifying…" : "Verify configuration"}</Button></div><div className="rounded-lg bg-secondary/40 p-3"><p className="text-xs font-medium">Controlled test email</p><div className="mt-2 flex flex-col gap-2 sm:flex-row">{field("Recipient", testRecipient, setTestRecipient, "email", "Use a non-customer test mailbox")}</div><label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={testConfirmed} onChange={(event) => setTestConfirmed(event.target.checked)} /> I confirm this is a controlled, non-customer test recipient.</label><Button className="mt-2" size="sm" variant="outline" disabled={current?.status !== "ready" || Boolean(data?.emergencyStopActive) || !testConfirmed || !testRecipient || controlledEmailTest.isPending} onClick={() => controlledEmailTest.mutate({ recipient: testRecipient, confirm: true })}>{controlledEmailTest.isPending ? "Sending test…" : "Send controlled test"}</Button></div><p className="text-xs text-muted-foreground">Verification sends no message. The controlled-test action never turns automation on.</p></div> : <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{field("Provider", whatsapp.provider, (value) => setWhatsapp({ ...whatsapp, provider: value }))}{field("Phone number ID", whatsapp.phoneNumberId, (value) => setWhatsapp({ ...whatsapp, phoneNumberId: value }))}{field("Business account ID", whatsapp.businessAccountId, (value) => setWhatsapp({ ...whatsapp, businessAccountId: value }))}{field("Approved default template", whatsapp.defaultTemplate, (value) => setWhatsapp({ ...whatsapp, defaultTemplate: value }))}{field("Access token", whatsapp.accessToken, (value) => setWhatsapp({ ...whatsapp, accessToken: value }), "password", "Enter once — never shown again")}{field("Webhook verify token", whatsapp.webhookVerifyToken, (value) => setWhatsapp({ ...whatsapp, webhookVerifyToken: value }), "password")}{field("Webhook signing secret", whatsapp.webhookSignatureSecret, (value) => setWhatsapp({ ...whatsapp, webhookSignatureSecret: value }), "password")}</div><div className="flex flex-wrap gap-2"><Button size="sm" disabled={saveWhatsapp.isPending} onClick={() => saveWhatsapp.mutate(whatsapp)}>{saveWhatsapp.isPending ? "Saving…" : "Save encrypted configuration"}</Button><Button size="sm" variant="outline" disabled={!current?.configured || verifyWhatsapp.isPending} onClick={() => verifyWhatsapp.mutate()}>{verifyWhatsapp.isPending ? "Checking…" : "Verify configuration"}</Button></div><p className="text-xs text-muted-foreground">A signed WhatsApp provider adapter and approved template validation are not installed. Verification and sending remain deliberately blocked.</p></div>}</div>
      <div className="rounded-xl border border-border p-4"><p className="font-medium">Platform audit</p><div className="mt-3 space-y-2">{(data?.audit || []).length ? data.audit.map((item: any) => <div key={item.id} className="flex flex-wrap justify-between gap-2 text-xs"><span>{item.channel} · {String(item.action).replaceAll("_", " ")} · {item.result}</span><span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div>) : <p className="text-xs text-muted-foreground">No platform communication changes recorded.</p>}</div></div>
    </>}
  </CardContent></Card>;
}

function OperationsReadinessPanel() {
  const utils = trpc.useUtils();
  const readiness = trpc.operations.status.useQuery();
  const saveEstimate = trpc.operations.saveEstimateSettings.useMutation({ onSuccess: () => { toast.success("Pricing policy saved."); utils.operations.status.invalidate(); }, onError: (error: any) => toast.error(error.message) });
  const saveState = trpc.operations.saveStateInput.useMutation({ onSuccess: () => { toast.success("State input saved."); utils.operations.status.invalidate(); }, onError: (error: any) => toast.error(error.message) });
  const [pricing, setPricing] = useState({ pricingVersion: "draft", installationCostPerKw: "", balanceOfSystemCostPerKw: "", taxRatePercent: "", sourceNote: "", effectiveFrom: "", verifiedOn: "", isPricingActive: false });
  const [stateInput, setStateInput] = useState({ stateName: "Telangana", stateCode: "TG", discomName: "", tariffPerUnit: "", avgSunHours: "", sourceNote: "", effectiveFrom: "", verifiedOn: "", isActive: false });
  const data = readiness.data as any;
  useEffect(() => {
    const current = data?.catalog?.estimateSettings;
    if (!current) return;
    setPricing({ pricingVersion: current.pricingVersion || "draft", installationCostPerKw: String(current.installationCostPerKw || ""), balanceOfSystemCostPerKw: String(current.balanceOfSystemCostPerKw || ""), taxRatePercent: String(current.taxRatePercent || ""), sourceNote: current.sourceNote || "", effectiveFrom: current.effectiveFrom ? String(current.effectiveFrom).slice(0, 10) : "", verifiedOn: current.lastVerifiedAt ? String(current.lastVerifiedAt).slice(0, 10) : "", isPricingActive: Boolean(current.isPricingActive) });
  }, [data?.catalog?.estimateSettings?.id]);
  const integrationCards = [
    ["SMTP email", data?.integrations?.smtp, "Server secrets only: host, port, TLS, user, password, from, reply-to, and explicit EMAIL_SENDING_ENABLED."],
    ["WhatsApp", data?.integrations?.whatsapp, "Disabled until a real provider adapter and verified credentials are available."],
    ["SMS / OTP", data?.integrations?.smsOtp, "Disabled until a verified SMS or WhatsApp Business adapter is installed."],
    ["AI Gateway", data?.integrations?.ai, "Use the encrypted provider controls below and test a provider before routing."],
    ["Maps & OCR", data?.integrations?.maps, "Platform-managed Maps and confirmed bill OCR are available."],
    ["Email webhooks", data?.integrations?.emailWebhook, "Set the signing secret and provider webhook before event intake."],
  ];
  const tone = (item: any) => ["ready", "available", "configured", "platform_managed"].includes(item?.state) ? "text-emerald-400" : item?.state === "disabled" ? "text-muted-foreground" : "text-amber-400";
  const iso = (date: string) => date ? new Date(`${date}T00:00:00.000Z`).toISOString() : null;
  return <Card className="border-primary/25"><CardHeader className="space-y-2"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Production operations</CardTitle><p className="text-sm text-muted-foreground">Integration credentials stay server-side. Customer communication stays disabled until a verified provider and an explicit agency control both allow it.</p></CardHeader><CardContent className="space-y-5">{readiness.isLoading ? <div className="h-32 rounded-xl bg-secondary animate-pulse" /> : <>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><MetricMini label="Verified panels" value={`${data?.catalog?.verifiedPanels || 0}/${data?.catalog?.activePanels || 0}`} /><MetricMini label="Verified inverters" value={`${data?.catalog?.verifiedInverters || 0}/${data?.catalog?.activeInverters || 0}`} /><MetricMini label="State inputs" value={String(data?.catalog?.stateInputs || 0)} /><MetricMini label="Pricing" value={data?.catalog?.pricingActive ? "active" : "withheld"} /></div>
    <div className="grid gap-2 sm:grid-cols-2">{integrationCards.map(([label, item, detail]) => <div key={label as string} className="rounded-xl border border-border bg-secondary/20 p-3"><div className="flex justify-between gap-2"><p className="text-sm font-medium">{label as string}</p><span className={`text-xs capitalize ${tone(item)}`}>{String((item as any)?.state || "unknown").replaceAll("_", " ")}</span></div><p className="mt-1 text-xs text-muted-foreground">{detail as string}</p></div>)}</div>
    <div className="rounded-xl border border-border p-4 space-y-3"><div className="flex items-center gap-2"><Database className="w-4 h-4 text-primary" /><p className="font-medium">Verified pricing policy</p></div><p className="text-xs text-muted-foreground">Monetary estimates remain withheld until owner-approved inputs are traceable and activated.</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Pricing version" value={pricing.pricingVersion} onChange={(v) => setPricing({ ...pricing, pricingVersion: v })} /><Field label="Effective from" value={pricing.effectiveFrom} onChange={(v) => setPricing({ ...pricing, effectiveFrom: v })} type="date" /><Field label="Installation ₹ / kW" value={pricing.installationCostPerKw} onChange={(v) => setPricing({ ...pricing, installationCostPerKw: v })} type="number" /><Field label="Balance of system ₹ / kW" value={pricing.balanceOfSystemCostPerKw} onChange={(v) => setPricing({ ...pricing, balanceOfSystemCostPerKw: v })} type="number" /><Field label="Tax / markup %" value={pricing.taxRatePercent} onChange={(v) => setPricing({ ...pricing, taxRatePercent: v })} type="number" /><Field label="Verified on" value={pricing.verifiedOn} onChange={(v) => setPricing({ ...pricing, verifiedOn: v })} type="date" /></div><Field label="Owner approval or source note" value={pricing.sourceNote} onChange={(v) => setPricing({ ...pricing, sourceNote: v })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pricing.isPricingActive} onChange={(event) => setPricing({ ...pricing, isPricingActive: event.target.checked })} /> Activate monetary estimates after verification</label><Button size="sm" disabled={saveEstimate.isPending} onClick={() => saveEstimate.mutate({ pricingVersion: pricing.pricingVersion, pricingMode: "catalog", installationCostPerKw: pricing.installationCostPerKw || null, balanceOfSystemCostPerKw: pricing.balanceOfSystemCostPerKw || null, taxRatePercent: pricing.taxRatePercent || null, warrantyTerms: null, pricingDisclosure: null, sourceNote: pricing.sourceNote || null, effectiveFrom: pricing.effectiveFrom || null, effectiveTo: null, lastVerifiedAt: iso(pricing.verifiedOn), isPricingActive: pricing.isPricingActive })}><Save className="mr-2 h-3.5 w-3.5" />Save pricing policy</Button></div>
    <div className="rounded-xl border border-border p-4 space-y-3"><div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /><p className="font-medium">State / DISCOM estimate input</p></div><div className="grid gap-3 sm:grid-cols-2"><Field label="State" value={stateInput.stateName} onChange={(v) => setStateInput({ ...stateInput, stateName: v })} /><Field label="State code" value={stateInput.stateCode} onChange={(v) => setStateInput({ ...stateInput, stateCode: v })} /><Field label="DISCOM" value={stateInput.discomName} onChange={(v) => setStateInput({ ...stateInput, discomName: v })} /><Field label="Tariff ₹ / unit" value={stateInput.tariffPerUnit} onChange={(v) => setStateInput({ ...stateInput, tariffPerUnit: v })} type="number" /><Field label="Average sun hours" value={stateInput.avgSunHours} onChange={(v) => setStateInput({ ...stateInput, avgSunHours: v })} type="number" /><Field label="Effective from" value={stateInput.effectiveFrom} onChange={(v) => setStateInput({ ...stateInput, effectiveFrom: v })} type="date" /><Field label="Verified on" value={stateInput.verifiedOn} onChange={(v) => setStateInput({ ...stateInput, verifiedOn: v })} type="date" /></div><Field label="Tariff / DISCOM source note" value={stateInput.sourceNote} onChange={(v) => setStateInput({ ...stateInput, sourceNote: v })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={stateInput.isActive} onChange={(event) => setStateInput({ ...stateInput, isActive: event.target.checked })} /> Activate only after verification</label><Button size="sm" variant="outline" disabled={saveState.isPending} onClick={() => saveState.mutate({ stateName: stateInput.stateName, stateCode: stateInput.stateCode, discomName: stateInput.discomName || null, tariffPerUnit: stateInput.tariffPerUnit || null, avgSunHours: stateInput.avgSunHours || null, systemLossPercent: null, netMeteringStatus: "unknown", subsidyDisclosure: null, subsidySourceUrl: null, sourceNote: stateInput.sourceNote || null, effectiveFrom: stateInput.effectiveFrom || null, effectiveTo: null, lastVerifiedAt: iso(stateInput.verifiedOn), isActive: stateInput.isActive })}>Save state input</Button></div>
    <div className="rounded-xl border border-border p-4 space-y-2"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /><p className="font-medium">Customer communication controls</p></div><p className="text-xs text-muted-foreground">Email, WhatsApp, schedules, and OTP are controlled only by the platform super-admin. Agencies can view readiness but cannot configure provider credentials or activate customer communication.</p></div>
    <div className="rounded-xl border border-border p-4"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /><p className="font-medium">Configuration audit</p></div><div className="mt-3 space-y-2">{(data?.audit || []).length ? data.audit.map((item: any) => <div key={item.id} className="flex justify-between gap-3 text-xs"><span className="font-medium">{item.action.replaceAll("_", " ")}</span><span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div>) : <p className="text-xs text-muted-foreground">No configuration changes recorded yet.</p>}</div></div>
  </>}</CardContent></Card>;
}

function AiGatewayPanel() {
  const utils = trpc.useUtils();
  const gateway = trpc.aiGateway.getDashboard.useQuery();
  const catalog = trpc.aiGateway.catalog.useQuery();
  const [provider, setProvider] = useState("sarvam");
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
      ...(provider === "builtin" || !apiKey.trim() ? {} : { apiKey: apiKey.trim() }),
      ...(provider === "cloudflare" ? { accountId } : {}),
      ...(provider !== "builtin" && provider !== "cloudflare" ? { baseUrl } : {}),
      defaultModel,
      isFreeTier,
      isEnabled,
      priority: Number(priority) || 100,
    });
  };

  const selectTextBrain = trpc.aiGateway.selectTextBrain.useMutation({
    onSuccess: () => { toast.success("Text AI brain updated. Follow-up automation stays separately controlled."); refresh(); },
    onError: (error: any) => toast.error(error.message),
  });
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
        <div className="rounded-xl border border-primary/30 p-4 space-y-3">
          <p className="font-medium">Sales Squad Core · Optional AI brain</p>
          <p className="text-sm text-muted-foreground">Keep lead capture, agency workspaces, surveys and proposals together. Add your Sarvam key below to use Sarvam for customer chat and Klaus. No key is required to retain the existing provider setup.</p>
          <p className="text-sm">Current text brain: {settings?.featurePolicies?.textBrainProvider === "sarvam" ? "Sarvam AI" : "Existing provider routing"}</p>
          <div className="flex flex-wrap gap-2"><Button size="sm" disabled={selectTextBrain.isPending || settings?.featurePolicies?.textBrainProvider === "sarvam"} onClick={() => selectTextBrain.mutate({ provider: "sarvam" })}>Use Sarvam as AI brain</Button><Button size="sm" variant="outline" disabled={selectTextBrain.isPending || settings?.featurePolicies?.textBrainProvider !== "sarvam"} onClick={() => selectTextBrain.mutate({ provider: "automatic" })}>Use existing provider routing</Button></div>
          <p className="text-xs text-muted-foreground">Sarvam API requests are billed by Sarvam. Test connection sends a small paid request. Selecting Sarvam does not allow fallback to another provider.</p>
        </div>
        <div className="rounded-xl border border-border p-4 space-y-2"><p className="font-medium">AI Follow-up add-on · Separate controls</p><p className="text-sm text-muted-foreground">Use the separate AI Follow-up panel below for calling, bill handling and prepaid controls. Saving a text AI key does not activate this workflow.</p></div>
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
            {provider !== "cloudflare" && provider !== "sarvam" && <Field label="Provider Base URL" value={baseUrl} onChange={setBaseUrl} />}
            <div><label className="text-sm font-medium mb-1.5 block">Default model</label><input list="provider-models" value={defaultModel} onChange={(event) => setDefaultModel(event.target.value)} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm" placeholder="Choose or enter a model ID" /><datalist id="provider-models">{(models.data || []).map((model: any) => <option key={model.modelId || model.id} value={model.modelId || model.id}>{model.displayName || model.modelId || model.id}</option>)}</datalist></div>
            <Field label="Priority (lower routes first)" value={priority} onChange={setPriority} type="number" />
          </div>}
          <div className="flex flex-wrap gap-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={provider === "sarvam" ? false : isFreeTier} disabled={provider === "sarvam"} onChange={(event) => setIsFreeTier(event.target.checked)} /> Prefer as free-tier capable</label><label className="flex items-center gap-2"><input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} /> Eligible for live routing</label></div>
          {selectedConnection?.lastErrorMessage && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">Latest provider issue: {selectedConnection.lastErrorMessage}</p>}
          <div className="flex flex-wrap gap-2"><Button size="sm" onClick={saveSelected} disabled={saveProvider.isPending}>{saveProvider.isPending ? "Saving…" : "Configure securely"}</Button><Button size="sm" variant="outline" onClick={() => testProvider.mutate({ provider: provider as any })} disabled={!selectedConnection?.credentialConfigured || testProvider.isPending}>{testProvider.isPending ? "Testing…" : "Test connection"}</Button>{selectedConnection?.credentialConfigured && provider !== "builtin" && <Button size="sm" variant="outline" className="text-destructive" onClick={() => disconnectProvider.mutate({ provider: provider as any })}>Disconnect</Button>}</div>
        </div>}

        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">The budget target is for planning; it is not an enforced spending cap. Set a provider-side limit before production use.</p>
          <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /><p className="font-medium">Gateway routing and budget planning</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><label className="text-sm font-medium mb-1.5 block">Routing mode</label><select value={settings?.routingMode || "auto"} onChange={(event) => updateGateway.mutate({ routingMode: event.target.value as any, freeModelsOnly: Boolean(settings?.freeModelsOnly), allowPaidFallback: Boolean(settings?.allowPaidFallback), monthlyBudgetInr: Number(settings?.monthlyBudgetInr || 0), warningThresholdPercent: Number(settings?.warningThresholdPercent || 70), criticalThresholdPercent: Number(settings?.criticalThresholdPercent || 90), providerPriority: settings?.providerPriority || [], featurePolicies: settings?.featurePolicies || {} })} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"><option value="auto">Auto — capability and health aware</option><option value="fastest">Fastest available</option><option value="free_first">Free first</option><option value="best_quality">Best configured quality</option><option value="manual">Manual selection only</option></select></div><Field label="Monthly paid-AI budget target (₹)" value={String(settings?.monthlyBudgetInr || 0)} onChange={(value) => updateGateway.mutate({ routingMode: settings?.routingMode || "auto", freeModelsOnly: Boolean(settings?.freeModelsOnly), allowPaidFallback: Boolean(settings?.allowPaidFallback), monthlyBudgetInr: Number(value || 0), warningThresholdPercent: Number(settings?.warningThresholdPercent || 70), criticalThresholdPercent: Number(settings?.criticalThresholdPercent || 90), providerPriority: settings?.providerPriority || [], featurePolicies: settings?.featurePolicies || {} })} type="number" /></div>
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
