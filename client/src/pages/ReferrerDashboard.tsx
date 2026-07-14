import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// Lead status pipeline stages
const PIPELINE_STAGES = [
  { key: "pending", label: "Lead Captured", color: "#64748b", icon: "📥" },
  { key: "verified", label: "Customer Verified", color: "#3b82f6", icon: "✅" },
  { key: "subsidy_applied", label: "Subsidy Applied", color: "#f97316", icon: "📋" },
  { key: "completed", label: "Installed", color: "#22c55e", icon: "🏠" },
];

function getStageIndex(referral: any): number {
  if (referral.status === "completed") return 3;
  if (referral.subsidyApplied) return 2;
  if (referral.customerVerified) return 1;
  return 0;
}

function QualityBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f97316" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "At Risk";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color }}>
        {score}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color }}>Lead Quality</p>
        <p style={{ margin: 0, fontSize: 10, color: "#64748b" }}>{label}</p>
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
  const [activeTab, setActiveTab] = useState<"overview" | "referrals" | "tasks" | "withdraw">("overview");

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

  const withdrawMutation = trpc.referrer.requestWithdrawal.useMutation({
    onSuccess: () => {
      setWithdrawMsg("✅ Withdrawal request submitted! We'll process it in 2-3 business days.");
      setWithdrawAmount(""); setUpiId("");
    },
    onError: (e) => setWithdrawMsg(`❌ ${e.message}`),
  });

  const referralLink = uniqueCode ? `${window.location.origin}/referral-landing/${uniqueCode}` : "";

  const copyLink = () => { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`🌞 Save on electricity bills with Solar!\nGet a FREE estimate and see how much you can save.\n\nClick here: ${referralLink}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  if (!uniqueCode) return null;

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #f97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#94a3b8" }}>Loading your dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data || !data.referrer) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", color: "#fff", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ color: "#f97316", marginBottom: 8 }}>Account Not Found</h2>
          <p style={{ color: "#94a3b8", marginBottom: 24 }}>Your referral code was not found. Please sign up again.</p>
          <button onClick={() => { localStorage.removeItem("referrerCode"); setLocation("/referrer-signup"); }}
            style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: 600 }}>
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
    padding: "10px 16px", border: "none", borderRadius: 8, cursor: "pointer" as const,
    fontWeight: 600 as const, fontSize: 13,
    background: activeTab === t ? "#f97316" : "rgba(255,255,255,0.06)",
    color: activeTab === t ? "#fff" : "#94a3b8", transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", fontFamily: "Arial, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } input:focus { outline: 2px solid #f97316; border-color: #f97316; }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderBottom: "1px solid rgba(249,115,22,0.3)", padding: "14px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, color: "#f97316", fontWeight: 700 }}>🌞 Sales Squad</h1>
            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Referral Dashboard</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {dailyStreak > 0 && (
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 16 }}>🔥</p>
                <p style={{ margin: 0, fontSize: 11, color: "#fb923c", fontWeight: 600 }}>{dailyStreak}d streak</p>
              </div>
            )}
            <QualityBadge score={qualityScore} />
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{referrer.name}</p>
              <p style={{ margin: 0, fontSize: 10, color: "#f97316", fontFamily: "monospace" }}>{uniqueCode}</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>

        {/* Quality Score Warning */}
        {qualityScore < 60 && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: "#f87171", fontSize: 14 }}>Lead Quality Warning</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>Your lead quality score is low ({qualityScore}%). Ensure customers verify their email. Accounts below 40% are suspended per our T&C.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(135deg, #1e3a1e, #0f2a0f)", border: "1px solid #16a34a", borderRadius: 12, padding: "14px 10px", textAlign: "center" as const }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#4ade80" }}>₹{Number(referrer.totalEarnings || 0).toLocaleString()}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#86efac" }}>Total Earned</p>
          </div>
          <div style={{ background: "linear-gradient(135deg, #1e2a3a, #0f1a2a)", border: "1px solid #3b82f6", borderRadius: 12, padding: "14px 10px", textAlign: "center" as const }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#60a5fa" }}>{referrer.totalReferrals || 0}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#93c5fd" }}>Referrals</p>
          </div>
          <div style={{ background: "linear-gradient(135deg, #2a1e0f, #1a0f00)", border: "1px solid #f97316", borderRadius: 12, padding: "14px 10px", textAlign: "center" as const }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fb923c" }}>{completedReferrals}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#fdba74" }}>Installed</p>
          </div>
        </div>

        {/* Pending verification nudge */}
        {pendingVerify > 0 && (
          <div style={{ background: "rgba(59,130,246,0.1)", border: "1px solid #3b82f6", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>📧</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600, color: "#60a5fa", fontSize: 13 }}>{pendingVerify} lead{pendingVerify > 1 ? "s" : ""} awaiting customer verification</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Ask your referrals to check their email and click the verification link.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const }}>
          <button style={tabStyle("overview")} onClick={() => setActiveTab("overview")}>📊 Overview</button>
          <button style={tabStyle("referrals")} onClick={() => setActiveTab("referrals")}>👥 Referrals{referrals?.length > 0 ? ` (${referrals.length})` : ""}</button>
          <button style={tabStyle("tasks")} onClick={() => setActiveTab("tasks")}>🎯 Tasks</button>
          <button style={tabStyle("withdraw")} onClick={() => setActiveTab("withdraw")}>💰 Withdraw</button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            {/* Share Link */}
            <div style={{ background: "#1e293b", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px", color: "#f97316", fontSize: 15 }}>📤 Share Your Referral Link</h3>
              <div style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px", marginBottom: 12, wordBreak: "break-all" as const, fontSize: 12, color: "#94a3b8", border: "1px solid #334155" }}>
                {referralLink}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={copyLink} style={{ flex: 1, background: copied ? "#16a34a" : "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
                <button onClick={shareWhatsApp} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  📱 WhatsApp
                </button>
              </div>
            </div>

            {/* Task Progress */}
            {activeTask && (
              <div style={{ background: "#1e293b", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, color: "#818cf8", fontSize: 15 }}>🎯 Daily Task #{activeTask.taskNumber}</h3>
                  <span style={{ background: "#312e81", color: "#a5b4fc", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>+₹{activeTask.bonusPerReferral}/referral</span>
                </div>
                <p style={{ margin: "0 0 10px", color: "#94a3b8", fontSize: 13 }}>
                  Get <strong style={{ color: "#fff" }}>{activeTask.targetReferrals} referrals</strong> to complete this task!
                </p>
                <div style={{ background: "#0f172a", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${taskProgress}%`, background: "linear-gradient(90deg, #f97316, #fbbf24)", borderRadius: 8, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                  <span>{activeTask.completedReferrals || 0} done</span>
                  <span>{taskProgress}% complete</span>
                  <span>{activeTask.targetReferrals} target</span>
                </div>
              </div>
            )}

            {/* How to Earn — updated commission info */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", color: "#f97316", fontSize: 15 }}>💡 How to Earn</h3>
              {[
                { icon: "1️⃣", title: "Share your link", desc: "Send to friends, family & neighbors", earn: "" },
                { icon: "2️⃣", title: "They get a site visit", desc: "Customer completes inspection & applies for govt subsidy", earn: "₹500" },
                { icon: "3️⃣", title: "Solar is installed", desc: "Installation confirmed by AB SOLAR", earn: "₹1,500" },
                { icon: "🎯", title: "Complete daily tasks", desc: "Hit milestones for extra bonuses per referral", earn: "₹100–₹300+" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < 3 ? 14 : 0 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{step.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{step.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{step.desc}</p>
                  </div>
                  {step.earn && <span style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{step.earn}</span>}
                </div>
              ))}
            </div>

            {/* Earnings Breakdown */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 14px", color: "#f97316", fontSize: 15 }}>📈 Earnings Breakdown</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Subsidy Bonuses (₹500)", value: `₹${(completedReferrals * 500 + subsidyReferrals * 500).toLocaleString()}`, color: "#60a5fa" },
                  { label: "Install Bonuses (₹1,500)", value: `₹${(completedReferrals * 1500).toLocaleString()}`, color: "#a78bfa" },
                  { label: "Subsidy Applied", value: subsidyReferrals.toString(), color: "#fb923c" },
                  { label: "Potential Earn", value: `₹${(subsidyReferrals * 1500).toLocaleString()}`, color: "#4ade80" },
                ].map((item, i) => (
                  <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: 12 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REFERRALS TAB — with pipeline stages */}
        {activeTab === "referrals" && (
          <div>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", color: "#f97316", fontSize: 15 }}>👥 People You Referred</h3>
              {!referrals || referrals.length === 0 ? (
                <div style={{ textAlign: "center" as const, padding: "32px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                  <p style={{ color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>No referrals yet!</p>
                  <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>Share your link to start earning. Every installation earns you ₹1,500!</p>
                  <button onClick={shareWhatsApp} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>
                    📱 Share on WhatsApp
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                  {referrals.map((r: any, i: number) => {
                    const stageIdx = getStageIndex(r);
                    return (
                      <div key={i} style={{ background: "#0f172a", borderRadius: 10, padding: 14, border: "1px solid #1e293b" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{r.customerName || "Anonymous"}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{r.customerEmail || r.customerPhone || "—"}</p>
                          </div>
                          <div style={{ textAlign: "right" as const }}>
                            {r.status === "completed" && <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>✅ +₹2,000</span>}
                            {r.subsidyApplied && r.status !== "completed" && <span style={{ background: "rgba(249,115,22,0.15)", color: "#fb923c", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>📋 +₹500</span>}
                          </div>
                        </div>

                        {/* Pipeline progress */}
                        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
                          {PIPELINE_STAGES.map((stage, si) => (
                            <div key={si} style={{ display: "flex", alignItems: "center", flex: si < PIPELINE_STAGES.length - 1 ? 1 : 0 }}>
                              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                                <div style={{ width: 24, height: 24, borderRadius: "50%", background: si <= stageIdx ? stage.color : "#1e293b", border: `2px solid ${si <= stageIdx ? stage.color : "#334155"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                                  {si <= stageIdx ? "✓" : si + 1}
                                </div>
                                <p style={{ margin: 0, fontSize: 9, color: si <= stageIdx ? stage.color : "#334155", textAlign: "center" as const, maxWidth: 50, lineHeight: 1.2 }}>{stage.label}</p>
                              </div>
                              {si < PIPELINE_STAGES.length - 1 && (
                                <div style={{ flex: 1, height: 2, background: si < stageIdx ? stage.color : "#1e293b", margin: "0 2px", marginBottom: 14 }} />
                              )}
                            </div>
                          ))}
                        </div>

                        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#64748b", flexWrap: "wrap" as const }}>
                          {r.monthlyBill && <span>💡 ₹{r.monthlyBill}/mo</span>}
                          {r.state && <span>📍 {r.state}</span>}
                          {!r.customerVerified && <span style={{ color: "#f97316" }}>⏳ Awaiting verification</span>}
                          {r.customerVerified && !r.subsidyApplied && <span style={{ color: "#3b82f6" }}>✅ Verified</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ background: "linear-gradient(135deg, #1a2a1a, #0f1a0f)", border: "1px solid #16a34a", borderRadius: 12, padding: 20, textAlign: "center" as const }}>
              <p style={{ margin: "0 0 12px", color: "#4ade80", fontWeight: 600 }}>Share your link to get more referrals!</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={copyLink} style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
                <button onClick={shareWhatsApp} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>
                  📱 WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div>
            {/* Streak Banner */}
            {dailyStreak > 0 && (
              <div style={{ background: "linear-gradient(135deg, #2a1a0a, #1a0a00)", border: "1px solid #f97316", borderRadius: 12, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 32 }}>🔥</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#fb923c", fontSize: 16 }}>{dailyStreak}-Day Streak!</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Keep referring daily to maintain your streak and unlock bonuses.</p>
                </div>
              </div>
            )}

            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", color: "#f97316", fontSize: 15 }}>🎯 Your Daily Tasks</h3>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>Complete tasks to unlock higher bonus rates per referral!</p>
              {!tasks || tasks.length === 0 ? (
                <p style={{ textAlign: "center" as const, color: "#64748b", padding: "20px 0" }}>No tasks yet. Make your first referral to unlock tasks!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                  {tasks.map((task: any, i: number) => {
                    const isActive = task.status === "active";
                    const isDone = task.status === "completed";
                    const prog = Math.min(100, Math.round(((task.completedReferrals || 0) / Number(task.targetReferrals)) * 100));
                    return (
                      <div key={i} style={{ background: "#0f172a", borderRadius: 10, padding: 16, border: `1px solid ${isDone ? "#16a34a" : isActive ? "#f97316" : "#1e293b"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isActive ? 10 : 0 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Task #{task.taskNumber} — {task.targetReferrals} Referrals</p>
                            {isActive && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Currently active</p>}
                          </div>
                          <div style={{ textAlign: "right" as const }}>
                            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fbbf24" }}>+₹{task.bonusPerReferral}</p>
                            <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>per referral</p>
                          </div>
                        </div>
                        {isActive && (
                          <>
                            <div style={{ background: "#1e293b", borderRadius: 6, height: 8, overflow: "hidden", marginBottom: 6 }}>
                              <div style={{ height: "100%", width: `${prog}%`, background: "linear-gradient(90deg, #f97316, #fbbf24)", borderRadius: 6 }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{task.completedReferrals || 0} / {task.targetReferrals} referrals — {prog}%</p>
                          </>
                        )}
                        {isDone && <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>✅ Completed</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Milestone Bonuses — ₹100 increments */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", color: "#818cf8", fontSize: 15 }}>🏆 Milestone Bonuses</h3>
              {[
                { referrals: 5, bonus: "₹100 bonus", label: "Starter", taskNum: 1 },
                { referrals: 10, bonus: "₹200 bonus", label: "Rising Star", taskNum: 2 },
                { referrals: 15, bonus: "₹300 bonus", label: "Champion", taskNum: 3 },
                { referrals: 20, bonus: "₹400 bonus", label: "Pro", taskNum: 4 },
                { referrals: 25, bonus: "₹500 bonus", label: "Legend", taskNum: 5 },
              ].map((m, i) => {
                const achieved = Number(referrer.totalReferrals || 0) >= m.referrals;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0f172a", borderRadius: 8, border: `1px solid ${achieved ? "#16a34a" : "#1e293b"}`, marginBottom: i < 4 ? 8 : 0 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</span>
                      <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>{m.referrals} referrals</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#fbbf24", fontWeight: 600 }}>{m.bonus}</span>
                      {achieved ? <span style={{ color: "#4ade80" }}>✅</span> : <span style={{ color: "#334155" }}>🔒</span>}
                    </div>
                  </div>
                );
              })}
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "#64748b" }}>Milestone bonuses are credited automatically when you reach each referral target.</p>
            </div>
          </div>
        )}

        {/* WITHDRAW TAB */}
        {activeTab === "withdraw" && (
          <div>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 4px", color: "#f97316", fontSize: 15 }}>💰 Request Withdrawal</h3>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
                Available: <strong style={{ color: "#4ade80" }}>₹{Number(referrer.totalEarnings || 0).toLocaleString()}</strong>
              </p>
              {withdrawMsg && (
                <div style={{ background: withdrawMsg.startsWith("✅") ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${withdrawMsg.startsWith("✅") ? "#16a34a" : "#dc2626"}`, borderRadius: 8, padding: 12, marginBottom: 16, color: withdrawMsg.startsWith("✅") ? "#4ade80" : "#f87171", fontSize: 14 }}>
                  {withdrawMsg}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Amount (₹)</label>
                  <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Enter amount"
                    style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>UPI ID</label>
                  <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                    style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14 }} />
                </div>
                <button
                  disabled={withdrawMutation.isPending || !withdrawAmount || !upiId}
                  onClick={() => { setWithdrawMsg(""); withdrawMutation.mutate({ uniqueCode, amount: Number(withdrawAmount), upiId }); }}
                  style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: 600, fontSize: 15, opacity: (withdrawMutation.isPending || !withdrawAmount || !upiId) ? 0.6 : 1 }}>
                  {withdrawMutation.isPending ? "Submitting..." : "Request Withdrawal"}
                </button>
              </div>
            </div>

            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", color: "#f97316", fontSize: 15 }}>📋 Withdrawal History</h3>
              {!withdrawals || withdrawals.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 13, textAlign: "center" as const, padding: "16px 0" }}>No withdrawal requests yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {withdrawals.map((w: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: 8, padding: "12px 14px" }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>₹{Number(w.amount).toLocaleString()}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{w.upiId}</p>
                      </div>
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: w.status === "approved" ? "rgba(74,222,128,0.15)" : w.status === "pending" ? "rgba(251,146,60,0.15)" : "rgba(239,68,68,0.15)", color: w.status === "approved" ? "#4ade80" : w.status === "pending" ? "#fb923c" : "#f87171" }}>
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
        <div style={{ textAlign: "center" as const, padding: "24px 0 8px", borderTop: "1px solid #1e293b", marginTop: 24 }}>
          <a href="/terms-referral" style={{ color: "#64748b", fontSize: 12, textDecoration: "none" }}>Terms & Conditions</a>
          <span style={{ color: "#334155", margin: "0 8px" }}>•</span>
          <span style={{ color: "#64748b", fontSize: 12 }}>Sales Squad Referral Program</span>
        </div>
      </div>
    </div>
  );
}
