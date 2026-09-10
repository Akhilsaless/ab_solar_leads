import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Send, Sun, Upload, UserRound, Zap } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { Streamdown } from "streamdown";
import { parseQuickReplyMarkup, shouldUseLocalWelcome } from "@shared/chatControls";
import { buildConfirmedBillMessage, hasDetectedBillValue, normalizeBillConfirmation, type BillConfirmationValues } from "@shared/billConfirmation";

type ChatMessage = {
  role: "bot" | "customer";
  content: string;
  quickReplies?: string[];
  createdAt?: Date | string;
  metadata?: Record<string, any>;
};

type Estimate = {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
  monthlyBill?: string | number | null;
  systemSizeKw?: string | number | null;
  estimatedCost?: string | number | null;
  subsidyAmount?: string | number | null;
  netCost?: string | number | null;
  estimatedSavingsMonthly?: string | number | null;
  paybackYears?: string | number | null;
};

const SMART_WELCOME = "Hi 👋 I’m Klaus, your solar advisor. I can estimate your savings, check subsidy eligibility, or answer a solar question. What would you like to do?";
const START_ACTIONS = ["Get my solar estimate", "Check subsidy", "Ask a solar question"];
const BILL_ACTIONS = ["₹1,000–₹2,000/month", "₹2,000–₹5,000/month", "₹5,000–₹10,000/month", "₹10,000+/month"];

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : null;
}

function EstimateCard({ estimate, brandColor }: { estimate: Estimate; brandColor: string }) {
  const rows: Array<[string, string]> = [];
  if (estimate.systemSizeKw) rows.push(["Recommended system", `~${estimate.systemSizeKw} kW`]);
  const cost = money(estimate.estimatedCost);
  if (cost) rows.push(["Estimated system cost", cost]);
  const subsidy = money(estimate.subsidyAmount);
  if (subsidy) rows.push(["Possible subsidy", `− ${subsidy}`]);
  const netCost = money(estimate.netCost);
  if (netCost) rows.push(["Estimated net cost", netCost]);
  const savings = money(estimate.estimatedSavingsMonthly);
  if (savings) rows.push(["Estimated monthly savings", `${savings}/mo`]);
  if (estimate.paybackYears) rows.push(["Estimated payback", `~${estimate.paybackYears} years`]);
  const hasMonetaryEstimate = Boolean(cost || subsidy || netCost || savings || estimate.paybackYears);

  return (
    <div className="mt-3 w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-xl">
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: `${brandColor}18` }}>
        <Zap className="h-4 w-4" style={{ color: brandColor }} />
        <span className="text-sm font-semibold text-white">Your preliminary solar estimate</span>
        <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">Site check required</span>
      </div>
      {rows.length > 0 && (
        <div className="divide-y divide-white/5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="text-xs text-gray-400">{label}</span>
              <span className="text-right text-sm font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      )}
      {!hasMonetaryEstimate && (
        <div className="border-t border-white/5 px-4 py-3 text-xs leading-relaxed text-gray-300">
          Pricing, savings, subsidy and payback will be confirmed after your solar provider has verified its commercial configuration and completed the required assessment.
        </div>
      )}
      <div className="px-4 py-3 text-[11px] leading-relaxed text-gray-500">
        Estimates are indicative and depend on tariff, roof/site conditions, equipment, DISCOM rules and subsidy eligibility.
      </div>
    </div>
  );
}

function QuickReplies({ replies, brandColor, onPick }: { replies: string[]; brandColor: string; onPick: (value: string) => void }) {
  if (!replies.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {replies.slice(0, 4).map(reply => (
        <button key={reply} onClick={() => onPick(reply)} className="min-h-10 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition hover:-translate-y-0.5" style={{ borderColor: `${brandColor}45`, background: `${brandColor}12`, color: brandColor }}>
          {reply}
        </button>
      ))}
    </div>
  );
}

export default function SmartChatBot() {
  const params = useParams<{ slug?: string; code?: string }>();
  const firstAgency = trpc.agency.getFirst.useQuery();
  const fallbackSlug = typeof firstAgency.data === "string" ? firstAgency.data : "demo";
  const slug = params.slug || fallbackSlug;
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const referrerCode = params.code || query.get("ref") || undefined;
  const brandFallback = "#F97316";

  const [sessionId] = useState(() => {
    const storageKey = `smart-chat-session-${params.slug || params.code || "default"}`;
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const id = nanoid(24);
    localStorage.setItem(storageKey, id);
    return id;
  });
  const consentStorageKey = `smart-chat-contact-consent-${sessionId}`;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [agency, setAgency] = useState<any>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBillTools, setShowBillTools] = useState(false);
  const [contactIntent, setContactIntent] = useState<string | null>(null);
  const [contactConsent, setContactConsent] = useState(() => localStorage.getItem(consentStorageKey) === "true");
  const [ocrConfirmation, setOcrConfirmation] = useState<BillConfirmationValues | null>(null);
  const [uploading, setUploading] = useState(false);
  const [startupError, setStartupError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const brandColor = agency?.color || brandFallback;
  const readBill = trpc.billReader.readBillImage.useMutation();
  const uploadBill = trpc.chat.uploadBill.useMutation();

  const startConversation = trpc.chat.startConversation.useMutation({
    onSuccess: data => {
      const incoming = (data.messages || []).map((m: any) => {
        const parsed = parseQuickReplyMarkup(String(m.content || ""));
        return { role: m.role, content: parsed.content, quickReplies: parsed.quickReplies, createdAt: m.createdAt };
      }) as ChatMessage[];
      if (shouldUseLocalWelcome(incoming.length)) setMessages([{ role: "bot", content: SMART_WELCOME, createdAt: new Date(), quickReplies: START_ACTIONS }]);
      else setMessages(incoming);
      setAgency(data.agency || null);
      setStartupError("");
    },
    onError: error => setStartupError(error.message || "Could not start chat."),
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: data => {
      const parsed = parseQuickReplyMarkup(String(data.response || ""));
      const alreadyConsented = localStorage.getItem(consentStorageKey) === "true";
      const isDuplicateConsentPrompt = data.stage === "request_contact_consent" && alreadyConsented;
      if (!isDuplicateConsentPrompt) {
        setMessages(prev => [...prev, { role: "bot", content: parsed.content, quickReplies: data.stage === "request_contact_consent" ? [] : Array.isArray(data.quickReplies) ? data.quickReplies : parsed.quickReplies, metadata: data.estimate || undefined, createdAt: new Date() }]);
      }
      setIsLoading(false);

      if (data.estimate?.estimatedCost || data.stage === "show_estimate" || data.stage === "commercial_estimate") {
        setEstimate(data.estimate as Estimate);
        setShowBillTools(false);
      } else {
        const text = String(data.response || "").toLowerCase();
        setShowBillTools(/electricity bill|monthly bill|bill amount|units|kwh/.test(text));
      }
      if (data.stage === "request_contact_consent" && !alreadyConsented) {
        setContactIntent("Please arrange a callback about my solar request");
      }
    },
    onError: error => {
      setMessages(prev => [...prev, { role: "bot", content: error.message?.includes("wait") ? "You’re sending messages quickly. Please wait a moment and try again." : "I couldn’t process that just now. Please try again.", createdAt: new Date() }]);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (startedRef.current || firstAgency.isLoading || !slug) return;
    startedRef.current = true;
    startConversation.mutate({ agencySlug: slug, sessionId, utmSource: query.get("utm_source") || undefined, utmMedium: query.get("utm_medium") || undefined, utmCampaign: query.get("utm_campaign") || undefined, referrerCode });
  }, [firstAgency.isLoading, query, referrerCode, sessionId, slug, startConversation]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading, estimate]);

  const send = useCallback((value?: string) => {
    const text = (value ?? input).trim();
    if (!text || isLoading) return;
    setMessages(prev => [...prev.map(m => ({ ...m, quickReplies: [] })), { role: "customer", content: text, createdAt: new Date() }]);
    setInput(""); setIsLoading(true); setShowBillTools(false);
    sendMessage.mutate({ sessionId, message: text });
  }, [input, isLoading, sendMessage, sessionId]);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 4 * 1024 * 1024) {
      setMessages(prev => [...prev, { role: "bot", content: "Please upload a PDF, JPG or PNG electricity bill up to 4 MB.", createdAt: new Date() }]); return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error("read_failed")); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.readAsDataURL(file);
      });
      const uploaded = await uploadBill.mutateAsync({ sessionId, fileName: file.name, contentType: file.type as any, contentBase64: base64 });
      const parsed = await readBill.mutateAsync({ imageUrl: uploaded.url, contentType: file.type as "application/pdf" | "image/jpeg" | "image/png" });
      if (parsed.success && parsed.data) {
        const detected = normalizeBillConfirmation(parsed.data);
        if (hasDetectedBillValue(detected)) {
          setOcrConfirmation(detected); setShowBillTools(false);
          setMessages(prev => [...prev, { role: "bot", content: "I found details on the uploaded bill. Please review or correct each detected field before I use it for a preliminary estimate.", createdAt: new Date() }]);
        } else send("I uploaded my electricity bill, but the details were unclear. Ask me for only the minimum information needed for an estimate.");
      } else send("My bill could not be read. Ask me for only the minimum information needed for an estimate.");
    } catch {
      setMessages(prev => [...prev, { role: "bot", content: "I couldn’t read that bill. You can simply type your approximate monthly bill instead.", createdAt: new Date() }]);
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const requestContact = (intent: string) => {
    if (localStorage.getItem(consentStorageKey) === "true") {
      send(`${intent}. I already consented to being contacted for this solar request. Please ask only for the contact detail or preferred time still needed.`);
      return;
    }
    setContactIntent(intent);
    setContactConsent(false);
  };

  const confirmContact = () => {
    if (!contactIntent || !contactConsent) return;
    const intent = contactIntent;
    localStorage.setItem(consentStorageKey, "true");
    setContactConsent(true);
    setContactIntent(null);
    send(`${intent}. I agree to be contacted about this solar request. Please ask only for the phone number or preferred callback time still needed.`);
  };

  const confirmOcrDetails = () => {
    if (!ocrConfirmation || !hasDetectedBillValue(ocrConfirmation)) return;
    const confirmed = buildConfirmedBillMessage(ocrConfirmation); setOcrConfirmation(null); setShowBillTools(false); send(confirmed);
  };

  const last = messages[messages.length - 1];
  const quickReplies = last?.role === "bot" ? (last.quickReplies || []) : [];
  const showStartActions = messages.length === 1 && messages[0]?.role === "bot";

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <header className="border-b border-white/10 bg-gray-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}><Sun className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">Klaus · Solar Advisor</div><div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Online · Ask naturally</div></div>
          <button onClick={() => requestContact("I’d like to speak with a solar consultant")} className="hidden min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-gray-300 hover:bg-white/5 sm:flex"><UserRound className="h-4 w-4" /> Talk to a person</button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {startupError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{startupError}</div>}
        {messages.map((message, index) => <div key={`${index}-${message.createdAt}`} className={`flex ${message.role === "customer" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] sm:max-w-[78%] ${message.role === "customer" ? "items-end" : "items-start"} flex flex-col`}><div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "bot" ? "rounded-bl-md border border-white/10 bg-white/[0.06] text-gray-100" : "rounded-br-md text-white"}`} style={message.role === "customer" ? { background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` } : undefined}>{message.role === "bot" ? <Streamdown>{parseQuickReplyMarkup(message.content).content}</Streamdown> : <span className="whitespace-pre-wrap">{message.content}</span>}</div>{index === messages.length - 1 && message.role === "bot" && <QuickReplies replies={showStartActions ? START_ACTIONS : quickReplies} brandColor={brandColor} onPick={send} />}</div></div>)}
        {isLoading && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-xs text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Klaus is thinking…</div></div>}
        {estimate && <EstimateCard estimate={estimate} brandColor={brandColor} />}
        {estimate && !contactIntent && <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><button onClick={() => requestContact("Please send my detailed estimate on WhatsApp")} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-gray-200 hover:bg-white/[0.08]">💬 WhatsApp estimate</button><button onClick={() => requestContact("I’d like to book a free solar site visit")} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-gray-200 hover:bg-white/[0.08]">🏠 Book site visit</button><button onClick={() => send("I want to keep chatting about this estimate")} className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-gray-200 hover:bg-white/[0.08]">Ask another question</button></div>}
        <div ref={endRef} />
      </div></main>
      <footer className="border-t border-white/10 bg-gray-950/90 p-3 backdrop-blur-xl"><div className="mx-auto max-w-3xl">
        {showBillTools && !estimate && <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3"><div className="mb-2 text-xs font-medium text-gray-300">Fastest way: choose a rough monthly bill or upload it.</div><div className="flex flex-wrap gap-2">{BILL_ACTIONS.map(value => <button key={value} onClick={() => send(`My electricity bill is about ${value}`)} className="min-h-10 rounded-xl border border-white/10 px-3 text-xs text-gray-300 hover:bg-white/5">{value}</button>)}<input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={event => void handleUpload(event.target.files?.[0])} /><button disabled={uploading} onClick={() => fileRef.current?.click()} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-gray-300 hover:bg-white/5 disabled:opacity-50">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload bill</button></div></div>}
        {ocrConfirmation && <div className="mb-3 rounded-2xl border border-sky-400/25 bg-sky-400/[0.06] p-3"><div className="mb-1 text-sm font-semibold text-white">Confirm bill details</div><p className="mb-3 text-xs leading-relaxed text-gray-400">These values were detected from your upload. Please correct anything uncertain before Klaus uses them.</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><label className="text-xs text-gray-300">Monthly bill (₹)<input inputMode="decimal" value={ocrConfirmation.amount} onChange={event => setOcrConfirmation(prev => prev ? { ...prev, amount: event.target.value } : prev)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white" placeholder="Not detected" /></label><label className="text-xs text-gray-300">Units (kWh)<input inputMode="numeric" value={ocrConfirmation.units} onChange={event => setOcrConfirmation(prev => prev ? { ...prev, units: event.target.value } : prev)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white" placeholder="Not detected" /></label><label className="text-xs text-gray-300">State<input value={ocrConfirmation.state} onChange={event => setOcrConfirmation(prev => prev ? { ...prev, state: event.target.value } : prev)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white" placeholder="Not detected" /></label><label className="text-xs text-gray-300">DISCOM / utility<input value={ocrConfirmation.discom} onChange={event => setOcrConfirmation(prev => prev ? { ...prev, discom: event.target.value } : prev)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white" placeholder="Not detected" /></label></div><div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => { setOcrConfirmation(null); setShowBillTools(true); }} className="flex-1 border-white/10 bg-transparent text-gray-300">Re-upload / enter manually</Button><Button disabled={!hasDetectedBillValue(ocrConfirmation)} onClick={confirmOcrDetails} className="flex-1 bg-sky-600 text-white hover:bg-sky-700">Use confirmed details</Button></div></div>}
        {contactIntent && localStorage.getItem(consentStorageKey) !== "true" && <div className="mb-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3"><div className="mb-2 flex items-center gap-2 text-sm font-medium text-white"><MessageCircle className="h-4 w-4 text-emerald-400" /> Continue with our solar team</div><p className="text-xs leading-relaxed text-gray-400">I agree to be contacted about this solar request. Klaus will ask only for the phone number or callback time still required.</p><div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => setContactIntent(null)} className="flex-1 border-white/10 bg-transparent text-gray-300">Not now</Button><Button onClick={() => { setContactConsent(true); }} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700">I agree — continue</Button></div>{contactConsent && <Button onClick={confirmContact} className="mt-2 w-full bg-emerald-600 text-white hover:bg-emerald-700">Continue</Button>}</div>}
        <div className="flex items-end gap-2"><Textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Ask naturally — e.g. ‘Hyderabad, residential, ₹6500 bill’" rows={1} disabled={isLoading || startConversation.isPending} className="min-h-11 max-h-32 flex-1 resize-none rounded-xl border-white/10 bg-white/[0.06] text-white placeholder:text-gray-500" /><Button onClick={() => send()} disabled={!input.trim() || isLoading} className="h-11 w-11 shrink-0 rounded-xl p-0" style={{ background: brandColor }}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-600"><span>Preliminary estimates only · No pressure</span><button onClick={() => requestContact("I’d like to speak with a solar consultant")} className="sm:hidden">Talk to a person</button></div>
      </div></footer>
    </div>
  );
}
