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

export default function ReferrerDashboard() {
  const [, setLocation] = useLocation();
  const [uniqueCode, setUniqueCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "referrals" | "tasks" | "withdraw" | "findleads">("overview");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || localStorage.getItem("referrerCode") || "";
    if (!code) { setLocation("/referrer-signup"); return; }
    setUniqueCode(code);
    localStorage.setItem("referrerCode", code);
  }, []);

  const { data, isLoading } = trpc.referrer.getDashboard.useQuery(
    { uniqueCode },
    { enabled: !!uniqueCode, retry: 1 }
  );

  const { data: potData } = trpc.referrer.getPotInfo.useQuery(undefined, { staleTime: 30000 });

  const withdrawMutation = trpc.referrer.requestWithdrawal.useMutation({
    onSuccess: () => {
      setWithdrawMsg("✅ Withdrawal request submitted! We'll process it in 2-3 business days.");
      setWithdrawAmount(""); setUpiId("");
    },
    onError: (e) => setWithdrawMsg(`❌ ${e.message}`),
  });

  // Bot link: direct to chatbot with referrer code as query param
  const agencySlugQuery = trpc.agency.getFirst.useQuery();
  const agencySlug = agencySlugQuery.data || "ab-solar";
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
  const activeTask = tasks?.find((t: any) => t.status === "active") || (tasks && tasks.length > 0 ? tasks[tasks.length - 1] : null);
  const completedReferrals = referrals?.filter((r: any) => r.status === "completed").length || 0;
  const subsidyReferrals = referrals?.filter((r: any) => r.subsidyApplied && r.status !== "completed").length || 0;
  const pendingVerify = referrals?.filter((r: any) => !r.customerVerified && r.status === "pending").length || 0;
  const qualityScore = Number(referrer.qualityScore ?? 100);
  const dailyStreak = Number(referrer.dailyStreak || 0);
  const taskProgress = activeTask ? Math.min(100, Math.round(((activeTask.completedReferrals || 0) / Number(activeTask.targetReferrals || 5)) * 100)) : 0;

  const tabStyle = (t: string) => ({
    padding: "9px 16px", border: "none", borderRadius: 8, cursor: "pointer" as const,
    fontWeight: 600 as const, fontSize: 13, transition: "all 0.2s",
    background: activeTab === t ? C.green : C.surface2,
    color: activeTab === t ? "#000" : C.subtle,
    boxShadow: activeTab === t ? `0 0 12px ${C.green}40` : "none",
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

        {/* ₹50 Welcome Bonus Banner — always visible */}
        <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))", border: `2px solid ${C.green}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 0 24px ${C.greenGlow}` }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: C.green, fontSize: 15 }}>🎁 Welcome Bonus Credited!</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: C.subtle }}>₹50 added to your account for joining Sales Squad</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: C.muted }}>Withdrawable after your 1st successful referral</p>
          </div>
          <span style={{ fontSize: 28, fontWeight: 800, color: C.green }}>+₹50</span>
        </div>

        {/* Reward Pool — prominent card */}
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button style={tabStyle("overview")} onClick={() => setActiveTab("overview")}>📊 Overview</button>
          <button style={tabStyle("referrals")} onClick={() => setActiveTab("referrals")}>👥 Referrals{referrals?.length > 0 ? ` (${referrals.length})` : ""}</button>
          <button style={tabStyle("tasks")} onClick={() => setActiveTab("tasks")}>🎯 Tasks</button>
          <button style={tabStyle("withdraw")} onClick={() => setActiveTab("withdraw")}>💰 Withdraw</button>
          <button style={{...tabStyle("findleads"), background: activeTab === "findleads" ? C.orange : C.surface2, color: activeTab === "findleads" ? "#000" : C.subtle, boxShadow: activeTab === "findleads" ? `0 0 12px ${C.orange}40` : "none"}} onClick={() => setActiveTab("findleads")}>🔍 Find Leads</button>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div>
            {/* ⚠️ IMPORTANT: Residential Houses Only */}
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
              <div>
                <p style={{ margin: "0 0 4px", color: "#fca5a5", fontWeight: 600, fontSize: 14 }}>Important: Property Eligibility</p>
                <p style={{ margin: 0, color: C.subtle, fontSize: 12 }}>This solar program is for <strong>residential houses and commercial properties</strong>. The customer must <strong>own the property</strong> or have <strong>written permission from the landlord</strong> for installation. Do NOT refer renters or shared-building residents without landlord approval. Verify before sharing your link!</p>
              </div>
            </div>

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
                <button onClick={shareWhatsApp} style={{ flex: 1, minWidth: 90, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  📱 WhatsApp
                </button>
                <button onClick={shareFacebook} style={{ flex: 1, minWidth: 90, background: "#1877f2", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  📘 Facebook
                </button>
                <button onClick={shareInstagram} style={{ flex: 1, minWidth: 90, background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  📸 Instagram
                </button>
              </div>
            </div>

            {/* Task Progress */}
            {activeTask && (
              <div style={{ background: C.surface, border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, color: "#818cf8", fontSize: 15 }}>🎯 Daily Task #{activeTask.taskNumber}</h3>
                  <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>+₹{activeTask.bonusPerReferral}/referral</span>
                </div>
                <p style={{ margin: "0 0 10px", color: C.subtle, fontSize: 13 }}>
                  Get <strong style={{ color: C.text }}>{activeTask.targetReferrals} referrals</strong> to complete this task!
                </p>
                <div style={{ background: C.bg, borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${taskProgress}%`, background: `linear-gradient(90deg, ${C.green}, #34d399)`, borderRadius: 8, transition: "width 0.5s", boxShadow: `0 0 8px ${C.green}60` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                  <span>{activeTask.completedReferrals || 0} done</span>
                  <span>{taskProgress}% complete</span>
                  <span>{activeTask.targetReferrals} target</span>
                </div>
              </div>
            )}

            {/* How to Earn */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", color: C.green, fontSize: 15 }}>💡 How to Earn</h3>
              {[
                { icon: "1️⃣", title: "Share your link", desc: "Send to friends, family & neighbors", earn: "" },
                { icon: "2️⃣", title: "They apply for govt subsidy", desc: "Customer completes site visit & applies for subsidy", earn: "₹500" },
                { icon: "3️⃣", title: "Solar is installed", desc: "Installation confirmed by Sales Squad", earn: "₹1,500" },
                { icon: "🎯", title: "Complete daily tasks", desc: "Hit milestones for extra bonuses per referral", earn: "₹100–₹500+" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < 3 ? 14 : 0 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{step.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{step.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>{step.desc}</p>
                  </div>
                  {step.earn && <span style={{ background: C.greenDim, color: C.green, padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{step.earn}</span>}
                </div>
              ))}
            </div>

            {/* Earnings Breakdown */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 14px", color: C.green, fontSize: 15 }}>📈 Earnings Breakdown</h3>
              {/* ₹50 signup bonus banner */}
              <div style={{ background: "rgba(16,185,129,0.08)", border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: C.subtle, fontSize: 13 }}>🎁 Signup Bonus (credited on join)</span>
                <span style={{ color: C.green, fontWeight: 700, fontSize: 15 }}>+₹50</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Subsidy Bonuses (₹500)", value: `₹${(completedReferrals * 500 + subsidyReferrals * 500).toLocaleString()}`, color: "#60a5fa" },
                  { label: "Install Bonuses (₹1,500)", value: `₹${(completedReferrals * 1500).toLocaleString()}`, color: "#a78bfa" },
                  { label: "Subsidy Applied", value: subsidyReferrals.toString(), color: C.orange },
                  { label: "Potential Earn", value: `₹${(subsidyReferrals * 1500).toLocaleString()}`, color: C.green },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>{item.label}</p>
                  </div>
                ))}
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
                    <button onClick={shareFacebook} style={{ background: "#1877f2", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📘 Facebook</button>
                    <button onClick={shareInstagram} style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📸 Instagram</button>
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

                        {/* Pipeline progress */}
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
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={copyLink} style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
                <button onClick={shareWhatsApp} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📱 WhatsApp</button>
                <button onClick={shareFacebook} style={{ background: "#1877f2", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📘 Facebook</button>
                <button onClick={shareInstagram} style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>📸 Instagram</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TASKS TAB ── */}
        {activeTab === "tasks" && (
          <div>
            {/* Streak Banner */}
            {dailyStreak > 0 && (
              <div style={{ background: C.orangeDim, border: `1px solid ${C.orange}`, borderRadius: 12, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 32 }}>🔥</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: C.orange, fontSize: 16 }}>{dailyStreak}-Day Streak!</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>Keep referring daily to maintain your streak and unlock bonuses.</p>
                </div>
              </div>
            )}

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", color: C.green, fontSize: 15 }}>🎯 Your Daily Tasks</h3>
              <p style={{ margin: "0 0 20px", color: C.muted, fontSize: 13 }}>Complete tasks to unlock higher bonus rates per referral!</p>
              {!tasks || tasks.length === 0 ? (
                <p style={{ textAlign: "center", color: C.muted, padding: "20px 0" }}>No tasks yet. Make your first referral to unlock tasks!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {tasks.map((task: any, i: number) => {
                    const isActive = task.status === "active";
                    const isDone = task.status === "completed";
                    const prog = Math.min(100, Math.round(((task.completedReferrals || 0) / Number(task.targetReferrals)) * 100));
                    return (
                      <div key={i} style={{ background: C.bg, borderRadius: 10, padding: 16, border: `1px solid ${isDone ? C.green : isActive ? C.borderGreen : C.border}`, boxShadow: isActive ? `0 0 15px ${C.greenGlow}` : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isActive ? 10 : 0 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Task #{task.taskNumber} — {task.targetReferrals} Referrals</p>
                            {isActive && <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>Currently active</p>}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fbbf24" }}>+₹{task.bonusPerReferral}</p>
                            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>per referral</p>
                          </div>
                        </div>
                        {isActive && (
                          <>
                            <div style={{ background: C.surface2, borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 6 }}>
                              <div style={{ height: "100%", width: `${prog}%`, background: `linear-gradient(90deg, ${C.green}, #34d399)`, borderRadius: 6, boxShadow: `0 0 6px ${C.green}60` }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{task.completedReferrals || 0} / {task.targetReferrals} referrals — {prog}%</p>
                          </>
                        )}
                        {isDone && <span style={{ color: C.green, fontSize: 13, fontWeight: 600 }}>✅ Completed</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Milestone Bonuses */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", color: "#818cf8", fontSize: 15 }}>🏆 Milestone Bonuses</h3>
              {[
                { referrals: 5, bonus: "₹100 bonus", label: "Starter" },
                { referrals: 10, bonus: "₹200 bonus", label: "Rising Star" },
                { referrals: 15, bonus: "₹300 bonus", label: "Champion" },
                { referrals: 20, bonus: "₹400 bonus", label: "Pro" },
                { referrals: 25, bonus: "₹500 bonus", label: "Legend" },
              ].map((m, i) => {
                const achieved = Number(referrer.totalReferrals || 0) >= m.referrals;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${achieved ? C.green : C.border}`, marginBottom: i < 4 ? 8 : 0, boxShadow: achieved ? `0 0 10px ${C.greenGlow}` : "none" }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</span>
                      <span style={{ color: C.muted, fontSize: 12, marginLeft: 8 }}>{m.referrals} referrals</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#fbbf24", fontWeight: 600 }}>{m.bonus}</span>
                      {achieved ? <span style={{ color: C.green }}>✅</span> : <span style={{ color: C.border }}>🔒</span>}
                    </div>
                  </div>
                );
              })}
              <p style={{ margin: "12px 0 0", fontSize: 12, color: C.muted }}>Milestone bonuses are credited automatically when you reach each referral target.</p>
            </div>
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
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Enter amount"
                    style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: C.subtle, display: "block", marginBottom: 6 }}>UPI ID</label>
                  <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                    style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", color: C.text, fontSize: 14 }} />
                </div>
                <button
                  disabled={withdrawMutation.isPending || !withdrawAmount || !upiId}
                  onClick={() => { setWithdrawMsg(""); withdrawMutation.mutate({ uniqueCode, amount: Number(withdrawAmount), upiId }); }}
                  style={{ background: C.green, color: "#000", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: 700, fontSize: 15, opacity: (withdrawMutation.isPending || !withdrawAmount || !upiId) ? 0.5 : 1, boxShadow: `0 0 15px ${C.green}40` }}>
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

        {/* ── FIND LEADS TAB ── */}
        {activeTab === "findleads" && (
          <ReferrerScraper referralLink={referralLink} referrerName={(referrer as any)?.name || "Sales Squad Referrer"} />
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
