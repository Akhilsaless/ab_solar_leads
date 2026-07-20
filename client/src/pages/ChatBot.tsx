import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sun, Zap, ArrowDown, Download, MapPin, X, Upload, Image as ImageIcon, MessageCircle, BarChart2, Play, PhoneCall } from "lucide-react";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";
import jsPDF from "jspdf";
import { MapView } from "@/components/Map";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type ChatMessage = {
  role: "bot" | "customer";
  content: string;
  quickReplies?: string[];
  createdAt?: Date | string;
  metadata?: Record<string, any>;
  type?: "text" | "bill_upload" | "video_pitch" | "animated_estimate" | "competitor_chart" | "agent_handoff";
};

// ─── Animated Estimate Card ─────────────────────────────────────────────────
function AnimatedNumber({ target, prefix = "", suffix = "", duration = 1200 }: { target: number; prefix?: string; suffix?: string; duration?: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!target) return;
    const steps = 40;
    const increment = target / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCurrent(Math.min(Math.round(increment * step), target));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{prefix}{current.toLocaleString("en-IN")}{suffix}</span>;
}

function AnimatedEstimateCard({ meta, brandColor }: { meta: Record<string, any>; brandColor: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);
  if (!meta?.estimatedCost) return null;
  const netCost = Number(meta.netCost) || 0;
  const subsidy = Number(meta.subsidyAmount) || 0;
  const savings = Number(meta.estimatedSavingsMonthly) || 0;
  const payback = Number(meta.paybackYears) || 0;
  const systemKw = Number(meta.systemSizeKw) || 0;
  const rows = [
    { label: "System Size", value: `~${systemKw} kW`, animated: false },
    { label: "Govt Subsidy", value: null, animated: true, target: subsidy, prefix: "−₹" },
    { label: "Your Net Cost", value: null, animated: true, target: netCost, prefix: "₹", highlight: true },
    { label: "Monthly Savings", value: null, animated: true, target: savings, prefix: "₹", suffix: "/mo" },
    { label: "Payback Period", value: `~${payback} yrs`, animated: false },
  ];
  return (
    <div
      className={`mt-3 ml-11 rounded-2xl border overflow-hidden transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ borderColor: `${brandColor}30`, background: "rgba(255,255,255,0.04)" }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${brandColor}18` }}>
        <BarChart2 className="w-4 h-4" style={{ color: brandColor }} />
        <span className="text-sm font-semibold text-white">Your Solar Estimate</span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row, i) => (
          <div key={i} className={`flex justify-between items-center px-4 py-2.5 ${row.highlight ? "bg-emerald-500/10" : ""}`}>
            <span className="text-xs text-gray-400">{row.label}</span>
            <span className={`text-sm font-semibold ${row.highlight ? "text-emerald-400" : "text-white"}`}>
              {row.animated && row.target !== undefined
                ? <AnimatedNumber target={row.target} prefix={row.prefix} suffix={row.suffix} />
                : row.value}
            </span>
          </div>
        ))}
      </div>
      <div className="px-4 py-2.5 bg-white/[0.03]">
        <p className="text-[10px] text-gray-500">After payback: 20+ years of near-free electricity</p>
      </div>
    </div>
  );
}

// ─── Competitor Comparison Chart ─────────────────────────────────────────────
function CompetitorChart({ meta, brandColor }: { meta: Record<string, any>; brandColor: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 200); return () => clearTimeout(t); }, []);
  if (!meta?.estimatedSavingsMonthly) return null;
  const savings = Number(meta.estimatedSavingsMonthly) || 0;
  const bill = Number(meta.monthlyBill) || 2500;
  const solarCost = Math.max(bill - savings, 200);
  const data = [
    { name: "Current Bill", cost: bill, fill: "#ef4444" },
    { name: "With Solar", cost: solarCost, fill: "#10b981" },
  ];
  return (
    <div
      className={`mt-3 ml-11 rounded-2xl border overflow-hidden transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ borderColor: `${brandColor}30`, background: "rgba(255,255,255,0.04)" }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${brandColor}18` }}>
        <BarChart2 className="w-4 h-4" style={{ color: brandColor }} />
        <span className="text-sm font-semibold text-white">Monthly Bill Comparison</span>
      </div>
      <div className="px-4 py-3">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Monthly Cost"]}
              contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
            />
            <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-1">
          <div className="text-center">
            <p className="text-xs text-red-400 font-medium">₹{bill.toLocaleString("en-IN")}/mo</p>
            <p className="text-[10px] text-gray-500">Without solar</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-emerald-400 font-medium">₹{solarCost.toLocaleString("en-IN")}/mo</p>
            <p className="text-[10px] text-gray-500">With solar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Solar Pitch Card (replaces video) ───────────────────────────────────────
function SolarPitchCard({ brandColor }: { brandColor: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);
  const points = [
    { icon: "⚡", title: "Bills rise 8–10% every year", desc: "Solar cuts your bill by up to 80% permanently." },
    { icon: "🏛️", title: "₹78,000 Govt Subsidy", desc: "PM Surya Ghar Yojana — real money, limited allocation." },
    { icon: "💰", title: "3–5 year payback", desc: "After that, 20+ years of near-free electricity." },
  ];
  return (
    <div
      className={`mt-3 ml-11 rounded-2xl border overflow-hidden transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ borderColor: `${brandColor}30`, background: "rgba(255,255,255,0.04)" }}
    >
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${brandColor}18` }}>
        <Sun className="w-4 h-4" style={{ color: brandColor }} />
        <span className="text-sm font-semibold text-white">Why Solar Makes Financial Sense</span>
      </div>
      <div className="divide-y divide-white/5">
        {points.map((p, i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <span className="text-xl shrink-0">{p.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{p.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Agent Handoff Card ───────────────────────────────────────────────────────
function AgentHandoffCard({ brandColor, agencyWhatsApp }: { brandColor: string; agencyWhatsApp?: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, []);
  if (dismissed) return null;
  const waNumber = agencyWhatsApp || "";
  const handleConnect = () => {
    if (waNumber) {
      window.open(`https://wa.me/${waNumber.replace(/[^0-9]/g, "")}?text=Hi%2C%20I%20was%20chatting%20with%20Agent%20Klaus%20and%20would%20like%20to%20speak%20with%20your%20team%20about%20solar.`, "_blank");
    }
  };
  return (
    <div
      className={`mt-3 ml-11 rounded-2xl border overflow-hidden transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ borderColor: `${brandColor}30`, background: "rgba(255,255,255,0.04)" }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: `${brandColor}18` }}>
        <div className="flex items-center gap-2">
          <PhoneCall className="w-4 h-4" style={{ color: brandColor }} />
          <span className="text-sm font-semibold text-white">Speak with Our Team</span>
        </div>
        <button onClick={() => setDismissed(true)} className="text-gray-500 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-gray-400 mb-3">Want to speak directly with a solar consultant? Connect on WhatsApp.</p>
        <div className="flex gap-2">
          {waNumber ? (
            <Button
              onClick={handleConnect}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-sm h-9"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat on WhatsApp
            </Button>
          ) : (
            <div className="flex-1 text-xs text-gray-500 italic py-2">WhatsApp number not configured yet.</div>
          )}
          <Button
            onClick={() => setDismissed(true)}
            variant="outline"
            className="border-white/20 text-gray-400 bg-transparent hover:bg-white/10 text-sm h-9"
          >
            Continue Chat
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Upload Button ───────────────────────────────────────────────────────
function BillUploadButton({ onUpload, brandColor, disabled }: { onUpload: (url: string) => void; brandColor: string; disabled: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { alert("File too large. Max 16MB."); return; }
    setUploading(true);
    try {
      const forgeUrl = (import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev").replace(/\/$/, "");
      const apiKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
      const key = `bill-uploads/${nanoid(16)}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const uploadUrl = `${forgeUrl}/v1/storage/upload?path=${encodeURIComponent(key)}`;
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const url = json.url || json.publicUrl || json.data?.url;
      if (url) onUpload(url);
      else throw new Error("No URL returned");
    } catch (e) {
      console.error("Bill upload error:", e);
      alert("Upload failed. Please type your bill amount instead.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <Button
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
        variant="outline"
        className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10 text-sm h-10"
      >
        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        {uploading ? "Uploading..." : "Upload Bill Photo"}
      </Button>
    </>
  );
}

// ─── Main ChatBot ─────────────────────────────────────────────────────────────
export default function ChatBot() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "demo";

  const [sessionId] = useState(() => {
    const stored = sessionStorage.getItem(`ab-solar-session-${slug}`);
    if (stored) return stored;
    const newId = nanoid(24);
    sessionStorage.setItem(`ab-solar-session-${slug}`, newId);
    return newId;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agencyInfo, setAgencyInfo] = useState<any>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [showMapPin, setShowMapPin] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [pinMarker, setPinMarker] = useState<google.maps.Marker | null>(null);
  const [pitchCardShown, setPitchCardShown] = useState(false);
  const [estimateShown, setEstimateShown] = useState(false);
  const [handoffShown, setHandoffShown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSequenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get("utm_source") || undefined;
  const utmMedium = urlParams.get("utm_medium") || undefined;
  const utmCampaign = urlParams.get("utm_campaign") || undefined;
  const autoCloseMinutes = urlParams.get("autoClose") ? parseInt(urlParams.get("autoClose")!) : null;
  const pathParts = window.location.pathname.split("/");
  const referrerCodeFromPath = pathParts.includes("refer") ? pathParts[pathParts.indexOf("refer") + 1] : undefined;
  const referrerCodeFromQuery = urlParams.get("ref") || undefined;
  const referrerCode = referrerCodeFromPath || referrerCodeFromQuery;

  const readBill = trpc.billReader.readBillImage.useMutation();

  const handleBillUpload = async (imageUrl: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "customer", content: "📎 [Electricity bill uploaded]", createdAt: new Date() }]);
    try {
      const result = await readBill.mutateAsync({ imageUrl });
      if (result.success && result.data) {
        const d = result.data;
        const parts = [];
        if (d.amount) parts.push(`My monthly bill is ₹${d.amount}`);
        if (d.units) parts.push(`${d.units} units`);
        if (d.state) parts.push(`I am from ${d.state}`);
        if (d.discom) parts.push(`DISCOM: ${d.discom}`);
        const msg = parts.length > 0 ? parts.join(", ") + "." : "I uploaded my electricity bill.";
        sendMsg.mutate({ sessionId, message: msg });
      } else {
        sendMsg.mutate({ sessionId, message: "I uploaded my electricity bill but couldn't read it clearly. Can you help me?" });
      }
    } catch {
      sendMsg.mutate({ sessionId, message: "I tried to upload my electricity bill." });
    }
  };

  const downloadPDF = () => {
    const lastBotMsg = messages.filter(m => m.role === "bot").pop();
    const meta = lastBotMsg?.metadata || {};
    const name = meta.customerName || "Valued Customer";
    const bill = meta.monthlyBill ? `₹${meta.monthlyBill}` : "₹2,500 (default)";
    const systemKw = meta.systemSizeKw ? `~${meta.systemSizeKw} kW` : "~3 kW";
    const cost = meta.estimatedCost ? `₹${Math.round(Number(meta.estimatedCost)).toLocaleString("en-IN")}` : "On Request";
    const subsidy = meta.subsidyAmount ? `₹${Math.round(Number(meta.subsidyAmount)).toLocaleString("en-IN")}` : "₹78,000";
    const netCost = meta.netCost ? `₹${Math.round(Number(meta.netCost)).toLocaleString("en-IN")}` : "On Request";
    const savings = meta.estimatedSavingsMonthly ? `₹${Math.round(Number(meta.estimatedSavingsMonthly)).toLocaleString("en-IN")}/month` : "On Request";
    const payback = meta.paybackYears ? `~${meta.paybackYears} years` : "~4 years";
    const loc = meta.customerCity ? `${meta.customerCity}${meta.customerState ? ", " + meta.customerState : ""}` : (meta.customerState || "");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const green = [16, 185, 129] as [number, number, number];
    const black = [10, 10, 10] as [number, number, number];
    const gray = [107, 114, 128] as [number, number, number];
    const lightGray = [243, 244, 246] as [number, number, number];
    const white = [255, 255, 255] as [number, number, number];
    const w = 210;
    doc.setFillColor(...green); doc.rect(0, 0, w, 40, "F");
    doc.setTextColor(...white); doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text("Solar Estimate", w / 2, 16, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Sales Squad — Agent Klaus", w / 2, 24, { align: "center" });
    doc.text(`Prepared for: ${name}${loc ? " — " + loc : ""}`, w / 2, 32, { align: "center" });
    doc.setTextColor(...gray); doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, w - 14, 46, { align: "right" });
    let y = 52;
    const row = (label: string, value: string, highlight = false) => {
      doc.setFillColor(...(highlight ? green : lightGray));
      doc.roundedRect(14, y, w - 28, 10, 2, 2, "F");
      doc.setTextColor(...(highlight ? white : black));
      doc.setFontSize(10); doc.setFont("helvetica", highlight ? "bold" : "normal");
      doc.text(label, 20, y + 7); doc.text(value, w - 20, y + 7, { align: "right" }); y += 13;
    };
    const section = (title: string) => {
      y += 4; doc.setTextColor(...green); doc.setFontSize(12); doc.setFont("helvetica", "bold");
      doc.text(title, 14, y); y += 6;
    };
    section("📊 Your Solar Estimate");
    row("Monthly Electricity Bill", bill); row("Recommended System Size", systemKw);
    row("Estimated System Cost", cost); row("Govt Subsidy (PM Surya Ghar)", `− ${subsidy}`);
    row("Your Net Cost", netCost, true);
    section("💰 Financial Benefits");
    row("Monthly Savings", savings); row("Payback Period", payback);
    row("After Payback", "FREE electricity for 20+ years!");
    section("🌟 Why Solar Now?");
    const reasons = ["• Electricity bills rising 8–10% every year", "• PM Surya Ghar Yojana subsidy — limited time", "• 25-year panel warranty, minimal maintenance", "• Increases your property value", "• Clean energy"];
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(...black);
    reasons.forEach(r => { doc.text(r, 20, y); y += 7; });
    const h = 297; y = h - 20;
    doc.setFillColor(...lightGray); doc.rect(0, y - 4, w, 24, "F");
    doc.setTextColor(...gray); doc.setFontSize(8);
    doc.text("This estimate is approximate. Actual costs may vary based on site conditions.", w / 2, y + 2, { align: "center" });
    doc.text("Sales Squad — Contact us to book your FREE site visit", w / 2, y + 8, { align: "center" });
    doc.save(`solar-estimate-${name.replace(/\s+/g, "-")}.pdf`);
  };

  const startConv = trpc.chat.startConversation.useMutation({
    onSuccess: (data) => {
      if (data.messages) setMessages(data.messages.map((m: any) => ({ role: m.role, content: m.content, createdAt: m.createdAt })));
      if (data.agency) setAgencyInfo(data.agency);
    },
  });

  const sendMsg = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      const newMsg: ChatMessage = {
        role: "bot",
        content: data.response,
        quickReplies: data.quickReplies || [],
        createdAt: new Date(),
        metadata: data.estimate || {},
      };
      setMessages(prev => [...prev, newMsg]);
      setIsLoading(false);

      // Show pitch card once after first bot message
      if (!pitchCardShown && (data.stage === "pitch_a" || data.stage === "pitch_b")) {
        setPitchCardShown(true);
      }

      // Show animated estimate + competitor chart when estimate is ready
      if (data.stage === "show_estimate" && data.estimate?.estimatedCost && !estimateShown) {
        setEstimateShown(true);
      }

      // Show optional agent handoff after estimate is shown
      if (data.stage === "ask_site_visit" && !handoffShown) {
        setHandoffShown(true);
      }

      // Auto-advance pitch sequence
      if (data.stage === "pitch_a" || data.stage === "pitch_b") {
        autoSequenceRef.current = setTimeout(() => {
          setIsLoading(true);
          sendMsg.mutate({ sessionId, message: "__auto_continue__" });
        }, 1200);
      }
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "bot", content: "Sorry, I'm having trouble right now. Please try again.", quickReplies: ["Try again"], createdAt: new Date() }]);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    startConv.mutate({ agencySlug: slug, sessionId, utmSource, utmMedium, utmCampaign, referrerCode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoCloseMinutes && autoCloseMinutes > 0) {
      const timer = setTimeout(() => setIsClosed(true), autoCloseMinutes * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [autoCloseMinutes]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement;
    if (!viewport) return;
    setShowScrollBtn(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 100);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSend = useCallback((text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;
    setMessages(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "bot" && updated[i].quickReplies?.length) {
          updated[i] = { ...updated[i], quickReplies: [] };
          break;
        }
      }
      return [...updated, { role: "customer", content: trimmed, createdAt: new Date() }];
    });
    setInput("");
    setIsLoading(true);
    sendMsg.mutate({ sessionId, message: trimmed });
    textareaRef.current?.focus();
  }, [input, isLoading, sessionId, sendMsg]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const brandColor = agencyInfo?.color || "#F97316";
  const agencyWhatsApp = agencyInfo?.whatsappNumber || "";

  const lastBotMsgIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "bot") return i;
    return -1;
  })();

  const initialQuickReplies = messages.length <= 1 && !isLoading ? [
    "I want to reduce my electricity bill",
    "How much does solar cost?",
    "Tell me about government subsidies",
    "I pay ₹3000/month in electricity",
  ] : [];

  // Get latest estimate metadata from any bot message
  const latestEstimateMeta = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "bot" && messages[i].metadata?.estimatedCost) return messages[i].metadata!;
    }
    return null;
  })();

  if (isClosed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto">
            <Sun className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Chat Session Closed</h2>
          <p className="text-gray-400">Thank you for chatting with {agencyInfo?.name || "Sales Squad"}!</p>
          <Button onClick={() => window.location.reload()} className="mt-6 solar-gradient text-black font-semibold">Start New Chat</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` }}>
            <Sun className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">Sales Squad Agent</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-400">Solar Advisor Online</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <Zap className="w-3.5 h-3.5" style={{ color: brandColor }} />
            <span className="text-xs text-gray-300 font-medium">Free Estimate</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 relative max-w-3xl mx-auto w-full">
        <ScrollArea ref={scrollRef as any} className="h-[calc(100vh-8rem-80px)]" onScrollCapture={handleScroll}>
          <div className="px-4 py-6 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 animate-slide-up ${msg.role === "customer" ? "flex-row-reverse" : ""}`}>
                {msg.role === "bot" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: `${brandColor}20` }}>
                    <Sun className="w-4 h-4" style={{ color: brandColor }} />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === "customer" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "bot" ? "bg-white/[0.07] border border-white/10 rounded-bl-md text-gray-100" : "text-white rounded-br-md"}`}
                    style={msg.role === "customer" ? { background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` } : {}}>
                    {msg.role === "bot" ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Pitch card — shown once after first pitch message */}
                  {msg.role === "bot" && i === lastBotMsgIndex && pitchCardShown && !estimateShown && (
                    <SolarPitchCard brandColor={brandColor} />
                  )}

                  {/* Animated estimate + competitor chart — shown when estimate is ready */}
                  {msg.role === "bot" && estimateShown && latestEstimateMeta && i === lastBotMsgIndex && (
                    <>
                      <AnimatedEstimateCard meta={latestEstimateMeta} brandColor={brandColor} />
                      <CompetitorChart meta={latestEstimateMeta} brandColor={brandColor} />
                    </>
                  )}

                  {/* Optional agent handoff */}
                  {msg.role === "bot" && handoffShown && i === lastBotMsgIndex && (
                    <AgentHandoffCard brandColor={brandColor} agencyWhatsApp={agencyWhatsApp} />
                  )}

                  {/* Quick replies */}
                  {msg.role === "bot" && i === lastBotMsgIndex && msg.quickReplies && msg.quickReplies.length > 0 && !isLoading && (
                    <div className="flex flex-wrap gap-2 mt-2 animate-fade-in">
                      {msg.quickReplies.map((reply, j) => (
                        <button key={j} onClick={() => handleSend(reply)}
                          className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                          style={{ background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}08)`, border: `1px solid ${brandColor}40`, color: brandColor }}>
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-slide-up">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: `${brandColor}20` }}>
                  <Sun className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <div className="bg-white/[0.07] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Initial quick replies */}
            {initialQuickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 ml-11 animate-fade-in">
                {initialQuickReplies.map((reply, i) => (
                  <button key={i} onClick={() => handleSend(reply)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                    style={{ background: `linear-gradient(135deg, ${brandColor}15, ${brandColor}08)`, border: `1px solid ${brandColor}40`, color: brandColor }}>
                    {reply}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {showScrollBtn && (
          <button onClick={scrollToBottom} className="absolute bottom-24 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all z-10">
            <ArrowDown className="w-4 h-4 text-gray-300" />
          </button>
        )}

        {/* Input Area */}
        <div className="border-t border-white/10 bg-gray-950/80 backdrop-blur-xl p-4">
          {messages.length > 2 && (
            <div className="mb-3 flex gap-2">
              <Button onClick={downloadPDF} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-10 text-sm">
                <Download className="w-4 h-4 mr-2" />Download Estimate
              </Button>
              <BillUploadButton onUpload={handleBillUpload} brandColor={brandColor} disabled={isLoading} />
              <Button onClick={() => {
                if (navigator.geolocation) {
                  setIsLoading(true);
                  const tid = setTimeout(() => { setIsLoading(false); setShowMapPin(true); }, 5000);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      clearTimeout(tid);
                      const { latitude: lat, longitude: lng } = pos.coords;
                      const geocoder = new google.maps.Geocoder();
                      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                        const address = status === "OK" && results?.[0] ? results[0].formatted_address : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        setIsLoading(false);
                        handleSend(`My location: ${address}`);
                      });
                    },
                    () => { clearTimeout(tid); setIsLoading(false); setShowMapPin(true); }
                  );
                } else setShowMapPin(true);
              }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 h-10 text-sm">
                <MapPin className="w-4 h-4 mr-2" />Location
              </Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 max-h-32 resize-none min-h-[44px] bg-white/[0.06] border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-white/20 focus:ring-0"
              rows={1}
              disabled={isLoading || startConv.isPending}
            />
            <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
              className="h-[44px] w-[44px] rounded-xl shrink-0"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
            </Button>
          </div>
          <p className="text-[10px] text-gray-600 text-center mt-2">Agent Klaus · Sales Squad · Your data is secure</p>
        </div>
      </div>

      {/* Map Pin Modal */}
      {showMapPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-white font-semibold">Drop Your Location Pin</h3>
                <p className="text-gray-400 text-xs mt-0.5">Tap on the map to mark your home</p>
              </div>
              <button onClick={() => setShowMapPin(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="h-72">
              <MapView onMapReady={(map) => {
                if (navigator.geolocation) {
                  let tid: NodeJS.Timeout | null = setTimeout(() => map.setCenter({ lat: 20.5937, lng: 78.9629 }), 3000);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => { if (tid) clearTimeout(tid); map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
                    () => { if (tid) clearTimeout(tid); map.setCenter({ lat: 20.5937, lng: 78.9629 }); }
                  );
                }
                map.addListener("click", (e: google.maps.MapMouseEvent) => {
                  if (!e.latLng) return;
                  const lat = e.latLng.lat(); const lng = e.latLng.lng();
                  if (pinMarker) pinMarker.setMap(null);
                  const marker = new google.maps.Marker({ position: { lat, lng }, map, animation: google.maps.Animation.DROP });
                  setPinMarker(marker);
                  new google.maps.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
                    const address = status === "OK" && results?.[0] ? results[0].formatted_address : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    setPinnedLocation({ lat, lng, address });
                  });
                });
              }} />
            </div>
            {pinnedLocation && <div className="p-3 bg-emerald-900/30 border-t border-emerald-500/20"><p className="text-emerald-400 text-xs font-medium">📍 {pinnedLocation.address}</p></div>}
            <div className="p-4 flex gap-3">
              <Button variant="outline" onClick={() => { setShowMapPin(false); setPinnedLocation(null); }} className="flex-1 border-white/20 text-white bg-transparent hover:bg-white/10">Cancel</Button>
              <Button onClick={() => { if (pinnedLocation) { setShowMapPin(false); handleSend(`My location: ${pinnedLocation.address}`); } }} disabled={!pinnedLocation} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-0">Confirm Location</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
