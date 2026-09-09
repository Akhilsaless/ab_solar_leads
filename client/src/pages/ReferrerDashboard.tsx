import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { SalesSquadLogo } from "@/components/SalesSquadLogo";
import ReferrerScraper from "./ReferrerScraper";

// ── Design tokens (Option B: Emerald Green on Pure Black) ──
const C = {
  bg: "#0a0a0a",
  surface: "#141414",
  surface2: "#1a1a1a",
  border: "#222",
  borderGreen: "rgba(16,185,129,0.3)",
  green: "#10b981",
  greenDim: "rgba(16,185,129,0.12)",
  greenGlow: "rgba(16,185,129,0.08)",
  text: "#fff",
  muted: "#555",
  subtle: "#888",
  orange: "#f97316",
  orangeDim: "rgba(249,115,22,0.12)",
  red: "#ef4444",
  blue: "#3b82f6",
};

// Lead status pipeline stages
const PIPELINE_STAGES = [
  { key: "pending", label: "Captured", color: C.muted, icon: "📥" },
  { key: "verified", label: "Verified", color: C.blue, icon: "✅" },
  { key: "subsidy_applied", label: "Subsidy", color: C.orange, icon: "📋" },
  { key: "completed", label: "Installed", color: C.green, icon: "🏠" },
];

function getStageIndex(referral: any): number {
  if (referral.status === "completed") return 3;
  if (referral.subsidyApplied) return 2;
  if (referral.customerVerified) return 1;
  return 0;
}

function QualityGauge({ score }: { score: number }) {
  const color = score >= 80 ? C.green : score >= 60 ? C.orange : C.red;
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "At Risk";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2.5px solid ${color}`, boxShadow: `0 0 10px ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color }}>
        {score}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color }}>Quality</p>
        <p style={{ margin: 0, fontSize: 10, color: C.muted }}>{label}</p>
      </div>
    </div>
  );
}

// ── AI Copilot Card ────────────────────────────────────────────────────────────
function AICopilotCard({ token, referrals, referrer }: { token: string; referrals: any[]; referrer: any }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [showAsk, setShowAsk] = useState(false);

  const { data: mission } = trpc.referralCoach.getTodaysMission.useQuery(
    { token },
    { enabled: !!token, staleTime: 60000 }
  );

  const askMutation = trpc.referralCoach.askCoach.useMutation({
    onSuccess: (data) => {
      const text = typeof data.answer === "string" ? data.answer : String(data.answer ?? "");
      setAnswer(text);
      setQuestion("");
    },
  });

  const totalRefs = Number(referrer?.totalReferrals || 0);
  const pendingVerify = referrals?.filter((r: any) => !r.customerVerified && r.status === "pending").length || 0;
  const subsidyPending = referrals?.filter((r: any) => r.customerVerified && !r.subsidyApplied && r.status !== "completed").length || 0;

  // Context-aware tip based on current pipeline state
  let copilotTip = "";
  let copilotAction = "";
  if (totalRefs === 0) {
    copilotTip = "You haven't shared your link yet. The fastest way to get your first lead is to send it to 3 people right now — family, neighbours, or a local shop owner with a high electricity bill.";
    copilotAction = "Share your link below. Agent Klaus handles all the explaining — you just share.";
  } else if (pendingVerify > 0) {
    copilotTip = `You have ${pendingVerify} lead${pendingVerify > 1 ? "s" : ""} waiting for customer verification. A quick WhatsApp follow-up asking them to check their email can help the referral progress to an eligible commission milestone.`;
    copilotAction = "Message them: \"Hi! Did you get the solar estimate link I shared? Just click the verify button in the email 😊\"";
  } else if (subsidyPending > 0) {
    copilotTip = `${subsidyPending} of your referrals are verified but haven't applied for subsidy yet. Once they do, you earn ₹500 per referral. Our team will follow up, but a nudge from you helps.`;
    copilotAction = "Remind them: \"The subsidy application is free and takes 10 minutes. Our team will guide them.\"";
  } else {
    copilotTip = "Great work! Keep the momentum going. Use the Find Leads tab to search for businesses in your city — factories, hotels, and hospitals are top targets with high electricity bills.";
    copilotAction = "Go to Find Leads → select Business Type → enter your city → filter by Large size for best results.";
  }

  return (
    <div style={{ background: `linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.03))`, border: `1px solid ${C.borderGreen}`, borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: `0 0 24px ${C.greenGlow}` }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.greenDim, border: `2px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, boxShadow: `0 0 12px ${C.green}40` }}>
          🤖
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: C.green, fontSize: 14 }}>AI Copilot</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>Your personal sales coach</p>
        </div>
      </div>

      {/* Today's Mission */}
      {mission && (
        <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.orange }}>🎯 Today's Mission</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.subtle }}>{mission.mission}</p>
          {mission.tip && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: C.green, fontWeight: 600 }}>💡 {mission.tip}</p>
          )}
        </div>
      )}

      {/* Context-aware insight */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, color: C.text, lineHeight: 1.6 }}>{copilotTip}</p>
        <div style={{ background: C.greenDim, border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "8px 12px" }}>
          <p style={{ margin: 0, fontSize: 11, color: C.green, fontWeight: 600 }}>💡 {copilotAction}</p>
        </div>
      </div>

      {/* Ask Copilot */}
      <button
        onClick={() => setShowAsk(!showAsk)}
        style={{ background: "transparent", border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: C.green, fontSize: 12, fontWeight: 600, width: "100%", textAlign: "left" as const }}
      >
        💬 Ask your AI Copilot anything...
      </button>

      {showAsk && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && question.trim()) {
                  askMutation.mutate({ token, question });
                }
              }}
              placeholder="e.g. How do I find businesses near me? What should I say on WhatsApp?"
              style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 12, outline: "none" }}
            />
            <button
              onClick={() => { if (question.trim()) askMutation.mutate({ token, question }); }}
              disabled={!question.trim() || askMutation.isPending}
              style={{ background: C.green, color: "#000", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12, opacity: (!question.trim() || askMutation.isPending) ? 0.5 : 1 }}
            >
              {askMutation.isPending ? "..." : "Ask"}
            </button>
          </div>
          {answer && (
            <div style={{ marginTop: 10, background: C.surface2, border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: C.green, fontWeight: 600 }}>🤖 Klaus says:</p>
              <p style={{ margin: 0, fontSize: 12, color: C.subtle, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── To-Do List ─────────────────────────────────────────────────────────────────
function TodoList({ referrals, referrer, shareWhatsApp, copyLink, setActiveTab }: {
  referrals: any[];
  referrer: any;
  shareWhatsApp: () => void;
  copyLink: () => void;
  setActiveTab: (tab: string) => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const totalRefs = Number(referrer?.totalReferrals || 0);
  const pendingVerify = referrals?.filter((r: any) => !r.customerVerified && r.status === "pending").length || 0;

  const todos = [
    {
      id: "share_link",
      label: "Share your referral link with 3 people today",
      sublabel: "Family, neighbours, or local business owners with high bills",
      action: <button onClick={shareWhatsApp} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 600, fontSize: 11 }}>📱 Share on WhatsApp</button>,
      done: totalRefs >= 3,
    },
    {
      id: "find_biz",
      label: "Search for 5 businesses in your city",
      sublabel: "Use Find Leads → select Factory/Hotel/Hospital → enter your city → Large size",
      action: <button onClick={() => setActiveTab("findleads")} style={{ background: C.orange, color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 600, fontSize: 11 }}>🔍 Find Leads</button>,
      done: false,
    },
    {
      id: "follow_up",
      label: `Follow up with ${pendingVerify > 0 ? pendingVerify : "pending"} contacts awaiting verification`,
      sublabel: "Ask them to check their email and click the verify link",
      action: <button onClick={copyLink} style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontWeight: 600, fontSize: 11 }}>📋 Copy Link</button>,
      done: pendingVerify === 0 && totalRefs > 0,
    },
    {
      id: "streak",
      label: "Maintain your daily streak",
      sublabel: "Log in and share at least once today to keep your streak alive",
      action: null,
      done: Number(referrer?.dailyStreak || 0) > 0,
    },
  ];

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 14px", color: C.text, fontSize: 15, fontWeight: 700 }}>✅ Today's To-Do List</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {todos.map((todo) => {
          const isDone = todo.done || checked[todo.id];
          return (
            <div key={todo.id} style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", border: `1px solid ${isDone ? C.borderGreen : C.border}`, opacity: isDone ? 0.7 : 1, transition: "all 0.2s" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <button
                  onClick={() => toggle(todo.id)}
                  style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isDone ? C.green : C.muted}`, background: isDone ? C.green : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#000", marginTop: 1 }}
                >
                  {isDone ? "✓" : ""}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isDone ? C.muted : C.text, textDecoration: isDone ? "line-through" : "none" }}>{todo.label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: C.muted }}>{todo.sublabel}</p>
                  {!isDone && todo.action && <div style={{ marginTop: 8 }}>{todo.action}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Potential Earnings Card ────────────────────────────────────────────────────
function PotentialEarnings({ referrals, referrer }: { referrals: any[]; referrer: any }) {
  const totalRefs = Number(referrer?.totalReferrals || 0);
  const verifiedLeads = referrals?.filter((r: any) => r.customerVerified).length || 0;
  const subsidyLeads = referrals?.filter((r: any) => r.subsidyApplied && r.status !== "completed").length || 0;
  const installedLeads = referrals?.filter((r: any) => r.status === "completed").length || 0;

  // Earned so far
  const earnedSubsidy = subsidyLeads * 500;
  const earnedInstalled = installedLeads * 1500;
  const totalEarned = 50 + earnedSubsidy + earnedInstalled; // ₹50 signup bonus

  // Potential if pipeline converts
  const pipelineLeads = referrals?.filter((r: any) => r.customerVerified && r.status !== "completed").length || 0;
  const potentialSubsidy = pipelineLeads * 500;
  const potentialInstall = pipelineLeads * 1500;
  const potentialTotal = potentialSubsidy + potentialInstall;

  // Projection: if they get 10 referrals/month
  const projMonthly = 10 * 20 + 3 * 500 + 1 * 1500; // 10 verified, 3 subsidy, 1 install

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 4px", color: C.text, fontSize: 15, fontWeight: 700 }}>💰 Potential Earnings</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: C.muted }}>Based on your current pipeline and typical conversion rates</p>

      {/* Current earnings */}
      <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 12, border: `1px solid ${C.borderGreen}` }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: C.green }}>Earned so far</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
          <div><span style={{ color: C.green, fontWeight: 700 }}>₹50</span> <span style={{ color: C.muted }}>signup bonus</span></div>
          <div><span style={{ color: "#60a5fa", fontWeight: 700 }}>{verifiedLeads}</span> <span style={{ color: C.muted }}>verified leads</span></div>
          <div><span style={{ color: C.orange, fontWeight: 700 }}>₹{earnedSubsidy.toLocaleString()}</span> <span style={{ color: C.muted }}>{subsidyLeads} subsidy</span></div>
          <div><span style={{ color: "#a78bfa", fontWeight: 700 }}>₹{earnedInstalled.toLocaleString()}</span> <span style={{ color: C.muted }}>{installedLeads} installed</span></div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.subtle }}>Total earned</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.green }}>₹{totalEarned.toLocaleString()}</span>
        </div>
      </div>

      {/* Pipeline potential */}
      {pipelineLeads > 0 && (
        <div style={{ background: "rgba(249,115,22,0.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 12, border: "1px solid rgba(249,115,22,0.2)" }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: C.orange }}>🔥 Unlockable from your pipeline</p>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: C.subtle }}>{pipelineLeads} verified lead{pipelineLeads > 1 ? "s" : ""} in progress</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: C.muted }}>If they install</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.orange }}>+₹{potentialTotal.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Monthly projection */}
      <div style={{ background: C.greenDim, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.borderGreen}` }}>
        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: C.green }}>📈 Monthly projection (active referrer)</p>
        <p style={{ margin: "0 0 8px", fontSize: 11, color: C.muted }}>10 referrals → 3 subsidy → 1 install per month</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.subtle }}>Estimated monthly</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.green }}>₹{projMonthly.toLocaleString()}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 10, color: C.muted }}>₹1,500 subsidy + ₹1,500 install + ₹100 task bonus</p>
      </div>

      {/* How to earn */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: C.subtle }}>Commission structure</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
          {[
            { earn: "₹500", label: "when subsidy applied", color: C.orange },
            { earn: "₹1,500", label: "when installed", color: "#a78bfa" },
            { earn: "₹100–₹500", label: "daily task bonus", color: "#fbbf24" },
          ].map((item, i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
              <p style={{ margin: 0, fontWeight: 700, color: item.color, fontSize: 13 }}>{item.earn}</p>
              <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 10 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Find Leads AI Coach ────────────────────────────────────────────────────────
function FindLeadsCoach({ token }: { token: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [showAsk, setShowAsk] = useState(false);

  const askMutation = trpc.referralCoach.askCoach.useMutation({
    onSuccess: (data) => {
      const text = typeof data.answer === "string" ? data.answer : String(data.answer ?? "");
      setAnswer(text);
      setQuestion("");
    },
  });

  const steps = [
    { step: "1", title: "Business Type", desc: "Pick a category from the dropdown — Factory, Hotel, Hospital, School, Warehouse, Office, Mall. Factories and hotels have the highest electricity bills and are the best solar candidates." },
    { step: "2", title: "City / Area", desc: "Type your city or a specific area (e.g. \"Hyderabad\" or \"Uppal, Hyderabad\"). The search pulls real businesses from Google Maps in that location." },
    { step: "3", title: "Size Filter", desc: "After results load, use the All / Large / Medium / Small filter. Start with Large — these businesses have 3-phase power connections and bills above ₹50,000/month." },
    { step: "4", title: "Solar Score", desc: "Each result shows a Solar Score (1-100). Focus on High (green) and Medium (orange) scores. These are businesses most likely to benefit from solar." },
    { step: "5", title: "Contact & Share", desc: "Click WhatsApp on any business to send them your referral link. Or use AI Pitch to generate a custom message for that specific business type." },
  ];

  return (
    <div style={{ background: `linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))`, border: "1px solid rgba(249,115,22,0.3)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(249,115,22,0.15)", border: "2px solid rgba(249,115,22,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          🔍
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: C.orange, fontSize: 14 }}>How to Use Business Search</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>Step-by-step guide to finding the right leads</p>
        </div>
      </div>

      {/* Step-by-step guide */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: C.bg, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.border}` }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(249,115,22,0.2)", border: "1.5px solid rgba(249,115,22,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.orange, flexShrink: 0 }}>
              {s.step}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: C.text }}>{s.title}</p>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: C.subtle, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pro tip */}
      <div style={{ background: "rgba(16,185,129,0.06)", border: `1px solid ${C.borderGreen}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.green, fontWeight: 600 }}>💡 Pro Tip</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: C.subtle }}>Skip businesses that already have solar panels visible on their roof (check Google Street View). Focus on industrial areas, IT parks, and commercial hubs — they have the highest bills and fastest decisions.</p>
      </div>

      {/* Ask Coach */}
      <button
        onClick={() => setShowAsk(!showAsk)}
        style={{ background: "transparent", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: C.orange, fontSize: 12, fontWeight: 600, width: "100%", textAlign: "left" as const }}
      >
        💬 Ask about the search tool...
      </button>

      {showAsk && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && question.trim()) {
                  askMutation.mutate({ token, question });
                }
              }}
              placeholder="e.g. Which business type should I search first? What size filter works best?"
              style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 12, outline: "none" }}
            />
            <button
              onClick={() => { if (question.trim()) askMutation.mutate({ token, question }); }}
              disabled={!question.trim() || askMutation.isPending}
              style={{ background: C.orange, color: "#000", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12, opacity: (!question.trim() || askMutation.isPending) ? 0.5 : 1 }}
            >
              {askMutation.isPending ? "..." : "Ask"}
            </button>
          </div>
          {answer && (
            <div style={{ marginTop: 10, background: C.surface2, border: "1px solid rgba(249,115,22,0.25)", borderRadius: 8, padding: "12px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: C.orange, fontWeight: 600 }}>🔍 Coach says:</p>
              <p style={{ margin: 0, fontSize: 12, color: C.subtle, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReferrerDashboard() {
  const [, setLocation] = useLocation();
  const [uniqueCode, setUniqueCode] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "referrals" | "findleads" | "withdraw">("dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || localStorage.getItem("referrerCode") || "";
    const token = localStorage.getItem("referrerToken") || "";
    if (!code || !token) { setLocation("/referrer-signup"); return; }
    setUniqueCode(code);
    setSessionToken(token);
    localStorage.setItem("referrerCode", code);
  }, []);

  const { data, isLoading } = trpc.referrer.getDashboard.useQuery(
    { token: sessionToken },
    { enabled: !!sessionToken, retry: 1 }
  );

  const { data: potData } = trpc.referrer.getPotInfo.useQuery(undefined, { staleTime: 30000 });

  const withdrawMutation = trpc.referrer.requestWithdrawal.useMutation({
    onSuccess: () => {
      setWithdrawMsg("✅ Withdrawal request submitted! We'll process it in 2-3 business days.");
      setWithdrawAmount(""); setUpiId("");
    },
    onError: (e) => setWithdrawMsg(`❌ ${e.message}`),
  });

  // Bot link
  const agencySlugQuery = trpc.agency.getFirst.useQuery();
  const agencySlug = agencySlugQuery.data || "demo";
  const referralLink = uniqueCode ? `${window.location.origin}/chat/${agencySlug}?ref=${uniqueCode}` : "";
  const copyLink = () => { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`🌞 *Save on your electricity bill with Solar!*\n\nHi! I'm sharing this with you because I think you'll find it useful.\n\nGet a FREE solar estimate in 2 minutes — no forms, just chat with our AI advisor:\n👉 ${referralLink}\n\nWorks for homes AND businesses too! 🏠🏢\nSee how much you can save every month! ☀️`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };
  const shareFacebook = () => {
    const url = encodeURIComponent(referralLink);
    const quote = encodeURIComponent(`🌞 Save on your electricity bill with Solar! Get a FREE estimate in 2 minutes — works for homes AND businesses! ☀️`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, "_blank", "width=600,height=400");
  };
  const shareInstagram = () => {
    const caption = `🌞 Save on your electricity bill with Solar!\n\nGet a FREE solar estimate in 2 minutes:\n👉 ${referralLink}\n\nWorks for homes AND businesses! ☀️ #Solar #SolarEnergy #SaveElectricity #GreenEnergy`;
    navigator.clipboard.writeText(caption);
    alert("Caption copied! Open Instagram, create a post or story, and paste the caption.");
  };
  const shareWhatsAppStatus = () => {
    const msg = encodeURIComponent(`🌞 *Save on electricity with Solar!*\n\nGet a FREE estimate in 2 minutes — chat with our AI advisor:\n👉 ${referralLink}\n\nWorks for homes & businesses! ☀️`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };
  const shareInstagramWithGraphic = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, "#0a0a0a"); grad.addColorStop(1, "#0d2b1a");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1080, 1920);
    const sunGrad = ctx.createRadialGradient(540, 500, 0, 540, 500, 280);
    sunGrad.addColorStop(0, "#fbbf24"); sunGrad.addColorStop(0.5, "#f97316"); sunGrad.addColorStop(1, "rgba(249,115,22,0)");
    ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(540, 500, 280, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(251,191,36,0.25)"; ctx.lineWidth = 4;
    for (let i = 0; i < 16; i++) { const angle = (i / 16) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(540 + Math.cos(angle) * 300, 500 + Math.sin(angle) * 300); ctx.lineTo(540 + Math.cos(angle) * 400, 500 + Math.sin(angle) * 400); ctx.stroke(); }
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 90px Arial"; ctx.textAlign = "center"; ctx.fillText("Switch to Solar", 540, 950);
    ctx.font = "bold 64px Arial"; ctx.fillStyle = "#10b981"; ctx.fillText("Save ₹2,000-5,000/month", 540, 1050);
    ctx.font = "44px Arial"; ctx.fillStyle = "#9ca3af"; ctx.fillText("Free estimate in 2 minutes", 540, 1150); ctx.fillText("Works for homes & businesses", 540, 1220);
    ctx.fillStyle = "rgba(16,185,129,0.15)"; ctx.strokeStyle = "#10b981"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(80, 1320, 920, 130, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#10b981"; ctx.font = "bold 38px Arial"; ctx.fillText("👉 Chat with our AI advisor", 540, 1395);
    ctx.fillStyle = "#6b7280"; ctx.font = "30px Arial"; ctx.fillText("Sales Squad • AI-Powered Solar Leads", 540, 1550);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "26px Arial";
    ctx.fillText(referralLink.replace(/^https?:\/\//, ""), 540, 1650);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `instagram-stories://share?backgroundImage=${encodeURIComponent(blobUrl)}&contentURL=${encodeURIComponent(referralLink)}&backgroundTopColor=%230a0a0a&backgroundBottomColor=%230d2b1a`;
        setTimeout(() => { const a = document.createElement("a"); a.href = blobUrl; a.download = "solar-story.png"; a.click(); URL.revokeObjectURL(blobUrl); alert("Instagram not detected. Image downloaded — open Instagram, tap + Story, and select the downloaded image."); }, 1500);
      } else {
        const a = document.createElement("a"); a.href = blobUrl; a.download = "solar-story.png"; a.click(); URL.revokeObjectURL(blobUrl);
        alert("Image downloaded! Open Instagram on your phone, tap + Story, and select this image to post.");
      }
    }, "image/png");
  };

  if (!uniqueCode) return null;

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 44, height: 44, border: `3px solid ${C.green}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px", boxShadow: `0 0 20px ${C.green}40` }} />
          <p style={{ color: C.subtle, fontSize: 14 }}>Loading your dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data || !data.referrer) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: C.orange, marginBottom: 8 }}>Account Not Found</h2>
          <p style={{ color: C.subtle, marginBottom: 24 }}>Your referral code was not found. Please sign up again.</p>
          <button onClick={() => { localStorage.removeItem("referrerCode"); setLocation("/referrer-signup"); }}
            style={{ background: C.green, color: "#000", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: 700 }}>
            Sign Up / Login
          </button>
        </div>
      </div>
    );
  }

  const { referrer, referrals, tasks, withdrawals } = data;
  const completedReferrals = referrals?.filter((r: any) => r.status === "completed").length || 0;
  const pendingVerify = referrals?.filter((r: any) => !r.customerVerified && r.status === "pending").length || 0;
  const qualityScore = Number(referrer.qualityScore ?? 100);
  const dailyStreak = Number(referrer.dailyStreak || 0);
  const activeTask = tasks?.find((t: any) => t.status === "active") || (tasks && tasks.length > 0 ? tasks[tasks.length - 1] : null);

  const tabStyle = (t: string) => ({
    padding: "9px 16px", border: "none", borderRadius: 8, cursor: "pointer" as const,
    fontWeight: 600 as const, fontSize: 13, transition: "all 0.2s",
    background: activeTab === t ? (t === "findleads" ? C.orange : C.green) : C.surface2,
    color: activeTab === t ? "#000" : C.subtle,
    boxShadow: activeTab === t ? `0 0 12px ${t === "findleads" ? C.orange : C.green}40` : "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } input:focus { outline: 2px solid ${C.green}; border-color: ${C.green}; }`}</style>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.borderGreen}`, padding: "14px 20px", boxShadow: `0 1px 20px ${C.greenGlow}` }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SalesSquadLogo size={32} showText={true} />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {dailyStreak > 0 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 16 }}>🔥</p>
                <p style={{ margin: 0, fontSize: 11, color: C.orange, fontWeight: 600 }}>{dailyStreak}d</p>
              </div>
            )}
            <QualityGauge score={qualityScore} />
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{referrer.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: C.green, fontFamily: "monospace" }}>{uniqueCode}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>

        {/* Quality Score Warning */}
        {qualityScore < 60 && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: `1px solid ${C.red}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: "#f87171", fontSize: 14 }}>Lead Quality Warning</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.subtle }}>Your lead quality score is low ({qualityScore}%). Ensure customers verify their email. Accounts below 40% are suspended per our T&C.</p>
            </div>
          </div>
        )}

        {/* ₹50 Welcome Bonus Banner */}
        <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))", border: `2px solid ${C.green}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 0 24px ${C.greenGlow}` }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: C.green, fontSize: 15 }}>🎁 Welcome Bonus Credited!</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.subtle }}>₹50 added to your account for joining Sales Squad</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: C.muted }}>Withdrawable after your 1st successful referral</p>
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: C.green }}>₹50</span>
        </div>

        {/* Reward Pool */}
        {potData && (
          <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(0,0,0,0))", border: `1px solid ${C.borderGreen}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 0 16px ${C.greenGlow}` }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>💰 Reward Pool</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>Funds reserved for referrer payouts</p>
              <div style={{ marginTop: 8, height: 4, borderRadius: 4, background: "#222", width: 140 }}>
                <div style={{ height: "100%", borderRadius: 4, background: Number(potData.balance) > 5000 ? C.green : C.orange, width: `${Math.min(100, Math.round(Number(potData.balance) / 100))}%`, transition: "width 0.5s" }} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: Number(potData.balance) > 2000 ? C.green : C.orange }}>₹{Number(potData.balance).toLocaleString()}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>available</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.borderGreen}`, borderRadius: 12, padding: "14px 10px", textAlign: "center", boxShadow: `0 0 20px ${C.greenGlow}` }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.green }}>₹{Number(referrer.totalEarnings || 0).toLocaleString()}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: C.subtle }}>Total Earned</p>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#60a5fa" }}>{referrer.totalReferrals || 0}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: C.subtle }}>Referrals</p>
          </div>
          <div style={{ background: C.surface, border: `1px solid rgba(249,115,22,0.3)`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.orange }}>{completedReferrals}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: C.subtle }}>Installed</p>
          </div>
        </div>

        {/* Pending verification nudge */}
        {pendingVerify > 0 && (
          <div style={{ background: "rgba(59,130,246,0.08)", border: `1px solid ${C.blue}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>📧</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, color: "#60a5fa", fontSize: 13 }}>{pendingVerify} lead{pendingVerify > 1 ? "s" : ""} awaiting customer verification</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>Ask your referrals to check their email and click the verification link.</p>
            </div>
          </div>
        )}

        {/* ── 4 TABS ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button style={tabStyle("dashboard")} onClick={() => setActiveTab("dashboard")}>🏠 Dashboard</button>
          <button style={tabStyle("referrals")} onClick={() => setActiveTab("referrals")}>👥 Referrals{referrals?.length > 0 ? ` (${referrals.length})` : ""}</button>
          <button style={tabStyle("findleads")} onClick={() => setActiveTab("findleads")}>🔍 Find Leads</button>
          <button style={tabStyle("withdraw")} onClick={() => setActiveTab("withdraw")}>💰 Withdraw</button>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && (
          <div>
            {/* AI Copilot Card */}
            <AICopilotCard token={sessionToken} referrals={referrals || []} referrer={referrer} />

            {/* To-Do List */}
            <TodoList
              referrals={referrals || []}
              referrer={referrer}
              shareWhatsApp={shareWhatsApp}
              copyLink={copyLink}
              setActiveTab={(tab) => setActiveTab(tab as any)}
            />

            {/* Potential Earnings */}
            <PotentialEarnings referrals={referrals || []} referrer={referrer} />

            {/* Active Task Progress (if any) */}
            {activeTask && (
              <div style={{ background: C.surface, border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, color: "#818cf8", fontSize: 15 }}>🎯 Active Task #{activeTask.taskNumber}</h3>
                  <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>+₹{activeTask.bonusPerReferral}/referral</span>
                </div>
                <p style={{ margin: "0 0 10px", color: C.subtle, fontSize: 13 }}>
                  Get <strong style={{ color: C.text }}>{activeTask.targetReferrals} referrals</strong> to complete this task!
                </p>
                <div style={{ background: C.bg, borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round(((activeTask.completedReferrals || 0) / Number(activeTask.targetReferrals || 5)) * 100))}%`, background: `linear-gradient(90deg, ${C.green}, #34d399)`, borderRadius: 8, transition: "width 0.5s", boxShadow: `0 0 8px ${C.green}60` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                  <span>{activeTask.completedReferrals || 0} done</span>
                  <span>{Math.min(100, Math.round(((activeTask.completedReferrals || 0) / Number(activeTask.targetReferrals || 5)) * 100))}% complete</span>
                  <span>{activeTask.targetReferrals} target</span>
                </div>
              </div>
            )}

            {/* Share Link */}
            <div style={{ background: C.surface, border: `1px solid ${C.borderGreen}`, borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: `0 0 30px ${C.greenGlow}` }}>
              <h3 style={{ margin: "0 0 12px", color: C.green, fontSize: 15 }}>📤 Share Your Referral Link</h3>
              <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 12, wordBreak: "break-all", fontSize: 12, color: C.subtle, border: `1px solid ${C.border}` }}>
                {referralLink}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={copyLink} style={{ flex: 1, minWidth: 100, background: copied ? C.green : C.surface2, color: copied ? "#000" : C.text, border: `1px solid ${copied ? C.green : C.border}`, borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
                  {copied ? "✅ Copied!" : "📋 Copy"}
                </button>
                <button onClick={shareWhatsApp} style={{ flex: 1, minWidth: 90, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>📱 WhatsApp</button>
                <button onClick={shareFacebook} style={{ flex: 1, minWidth: 90, background: "#1877f2", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>📘 Facebook</button>
                <button onClick={shareInstagram} style={{ flex: 1, minWidth: 90, background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>📸 Instagram</button>
                <button onClick={shareWhatsAppStatus} style={{ flex: 1, minWidth: 110, background: "#075e54", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>📱 WA Status</button>
                <button onClick={shareInstagramWithGraphic} style={{ flex: 1, minWidth: 120, background: "linear-gradient(45deg,#833ab4,#fd1d1d,#fcb045)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>🎨 IG Graphic</button>
              </div>
            </div>

            {/* Property Eligibility Warning */}
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <div>
                <p style={{ margin: "0 0 4px", color: "#fca5a5", fontWeight: 600, fontSize: 14 }}>Important: Property Eligibility</p>
                <p style={{ margin: 0, color: C.subtle, fontSize: 12 }}>This solar program is for <strong>residential houses and commercial properties</strong>. The customer must <strong>own the property</strong> or have <strong>written permission from the landlord</strong> for installation. Do NOT refer renters or shared-building residents without landlord approval.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── REFERRALS TAB ── */}
        {activeTab === "referrals" && (
          <div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", color: C.green, fontSize: 15 }}>👥 People You Referred</h3>
              {!referrals || referrals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                  <p style={{ color: C.subtle, margin: "0 0 8px", fontWeight: 600 }}>No referrals yet!</p>
                  <p style={{ color: C.muted, fontSize: 13, margin: "0 0 20px" }}>Share your link to start earning. Every installation earns you ₹1,500!</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={shareWhatsApp} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📱 WhatsApp</button>
                    <button onClick={shareInstagram} style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📸 Instagram</button>
                    <button onClick={shareWhatsAppStatus} style={{ background: "#075e54", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📱 WA Status</button>
                    <button onClick={shareInstagramWithGraphic} style={{ background: "linear-gradient(45deg,#833ab4,#fd1d1d,#fcb045)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>🎨 IG Graphic</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {referrals.map((r: any, i: number) => {
                    const stageIdx = getStageIndex(r);
                    return (
                      <div key={i} style={{ background: C.bg, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{r.customerName || "Anonymous"}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{r.customerEmail || r.customerPhone || "—"}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {r.status === "completed" && <span style={{ background: C.greenDim, color: C.green, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>✅ +₹2,000</span>}
                            {r.subsidyApplied && r.status !== "completed" && <span style={{ background: C.orangeDim, color: C.orange, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>📋 +₹500</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                          {PIPELINE_STAGES.map((stage, si) => (
                            <div key={si} style={{ display: "flex", alignItems: "center", flex: si < PIPELINE_STAGES.length - 1 ? 1 : 0 }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: si <= stageIdx ? stage.color : C.surface2, border: `2px solid ${si <= stageIdx ? stage.color : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, boxShadow: si <= stageIdx ? `0 0 8px ${stage.color}60` : "none" }}>
                                  {si <= stageIdx ? "✓" : si + 1}
                                </div>
                                <p style={{ margin: 0, fontSize: 9, color: si <= stageIdx ? stage.color : C.border, textAlign: "center", maxWidth: 50, lineHeight: 1.2 }}>{stage.label}</p>
                              </div>
                              {si < PIPELINE_STAGES.length - 1 && (
                                <div style={{ flex: 1, height: 2, background: si < stageIdx ? stage.color : C.surface2, margin: "0 2px", marginBottom: 14 }} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.muted, flexWrap: "wrap" }}>
                          {r.monthlyBill && <span>💡 ₹{r.monthlyBill}/mo</span>}
                          {r.state && <span>📍 {r.state}</span>}
                          {!r.customerVerified && <span style={{ color: C.orange }}>⏳ Awaiting verification</span>}
                          {r.customerVerified && !r.subsidyApplied && <span style={{ color: C.blue }}>✅ Verified</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ background: C.greenDim, border: `1px solid ${C.borderGreen}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", color: C.green, fontWeight: 600 }}>Share your link to get more referrals!</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={copyLink} style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
                <button onClick={shareWhatsApp} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📱 WhatsApp</button>
                <button onClick={shareFacebook} style={{ background: "#1877f2", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📘 Facebook</button>
                <button onClick={shareInstagram} style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📸 Instagram</button>
                <button onClick={shareWhatsAppStatus} style={{ background: "#075e54", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📱 WA Status</button>
                <button onClick={shareInstagramWithGraphic} style={{ background: "linear-gradient(45deg,#833ab4,#fd1d1d,#fcb045)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>🎨 IG Graphic</button>
              </div>
            </div>
          </div>
        )}

        {/* ── FIND LEADS TAB ── */}
        {activeTab === "findleads" && (
          <div>
            <FindLeadsCoach token={sessionToken} />
            <ReferrerScraper referralLink={referralLink} referrerName={(referrer as any)?.name || "Sales Squad Referrer"} />
          </div>
        )}

        {/* ── WITHDRAW TAB ── */}
        {activeTab === "withdraw" && (
          <div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 4px", color: C.green, fontSize: 15 }}>💰 Request Withdrawal</h3>
              <p style={{ margin: "0 0 20px", color: C.muted, fontSize: 13 }}>
                Available: <strong style={{ color: C.green }}>₹{Number(referrer.totalEarnings || 0).toLocaleString()}</strong>
              </p>
              {withdrawMsg && (
                <div style={{ background: withdrawMsg.startsWith("✅") ? C.greenDim : "rgba(239,68,68,0.08)", border: `1px solid ${withdrawMsg.startsWith("✅") ? C.green : C.red}`, borderRadius: 8, padding: 12, marginBottom: 16, color: withdrawMsg.startsWith("✅") ? C.green : "#f87171", fontSize: 14 }}>
                  {withdrawMsg}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: C.subtle, display: "block", marginBottom: 6 }}>Amount (₹)</label>
                  <input type="number" min={500} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Minimum ₹500"
                    style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: C.subtle, display: "block", marginBottom: 6 }}>UPI ID</label>
                  <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                    style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14 }} />
                </div>
                <button
                  disabled={withdrawMutation.isPending || Number(withdrawAmount) < 500 || !upiId}
                  onClick={() => { setWithdrawMsg(""); withdrawMutation.mutate({ token: sessionToken, amount: Number(withdrawAmount), upiId }); }}
                  style={{ background: C.green, color: "#000", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: 700, fontSize: 15, opacity: (withdrawMutation.isPending || Number(withdrawAmount) < 500 || !upiId) ? 0.5 : 1, boxShadow: `0 0 15px ${C.green}40` }}>
                  {withdrawMutation.isPending ? "Submitting..." : "Request Withdrawal"}
                </button>
              </div>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", color: C.green, fontSize: 15 }}>📋 Withdrawal History</h3>
              {!withdrawals || withdrawals.length === 0 ? (
                <p style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>No withdrawal requests yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {withdrawals.map((w: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>₹{Number(w.amount).toLocaleString()}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{w.upiId}</p>
                      </div>
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: w.status === "approved" ? C.greenDim : w.status === "pending" ? C.orangeDim : "rgba(239,68,68,0.12)", color: w.status === "approved" ? C.green : w.status === "pending" ? C.orange : C.red }}>
                        {w.status === "approved" ? "✅ Approved" : w.status === "pending" ? "⏳ Pending" : "❌ Rejected"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0 8px", borderTop: `1px solid ${C.border}`, marginTop: 24 }}>
          <a href="/terms-referral" style={{ color: C.muted, fontSize: 12, textDecoration: "none" }}>Terms & Conditions</a>
          <span style={{ color: C.border, margin: "0 8px" }}>•</span>
          <span style={{ color: C.muted, fontSize: 12 }}>Sales Squad Referral Program</span>
        </div>
      </div>
    </div>
  );
}
