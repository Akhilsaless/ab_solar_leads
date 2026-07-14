import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

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
    if (!code) {
      setLocation("/referrer-signup");
      return;
    }
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
      setWithdrawAmount("");
      setUpiId("");
    },
    onError: (e) => setWithdrawMsg(`❌ ${e.message}`),
  });

  const referralLink = uniqueCode ? `${window.location.origin}/referral-landing/${uniqueCode}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
  const currentTask = tasks && tasks.length > 0 ? tasks[tasks.length - 1] : null;
  const completedReferrals = referrals ? referrals.filter((r: any) => r.status === "completed").length : 0;
  const pendingReferrals = referrals ? referrals.filter((r: any) => r.status !== "completed").length : 0;
  const taskProgress = currentTask ? Math.min(100, Math.round((Number(referrer.totalReferrals || 0) / Number(currentTask.targetReferrals || 5)) * 100)) : 0;

  const s = (active: string) => ({
    padding: "10px 18px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600 as const,
    fontSize: 13,
    background: activeTab === active ? "#f97316" : "rgba(255,255,255,0.06)",
    color: activeTab === active ? "#fff" : "#94a3b8",
    transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", fontFamily: "Arial, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; } input:focus { outline: 2px solid #f97316; }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", borderBottom: "1px solid rgba(249,115,22,0.3)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: "#f97316", fontWeight: 700 }}>🌞 Sales Squad</h1>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Referral Dashboard</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{referrer.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: "#f97316", fontFamily: "monospace" }}>{uniqueCode}</p>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(135deg, #1e3a1e, #0f2a0f)", border: "1px solid #16a34a", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#4ade80" }}>₹{Number(referrer.totalEarnings || 0).toLocaleString()}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#86efac" }}>Total Earned</p>
          </div>
          <div style={{ background: "linear-gradient(135deg, #1e2a3a, #0f1a2a)", border: "1px solid #3b82f6", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#60a5fa" }}>{referrer.totalReferrals || 0}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#93c5fd" }}>Referrals</p>
          </div>
          <div style={{ background: "linear-gradient(135deg, #2a1e0f, #1a0f00)", border: "1px solid #f97316", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fb923c" }}>{completedReferrals}</p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#fdba74" }}>Installed</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" as const }}>
          <button style={s("overview")} onClick={() => setActiveTab("overview")}>📊 Overview</button>
          <button style={s("referrals")} onClick={() => setActiveTab("referrals")}>👥 Referrals {referrals?.length > 0 ? `(${referrals.length})` : ""}</button>
          <button style={s("tasks")} onClick={() => setActiveTab("tasks")}>🎯 Tasks</button>
          <button style={s("withdraw")} onClick={() => setActiveTab("withdraw")}>💰 Withdraw</button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            {/* Share Link */}
            <div style={{ background: "#1e293b", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px", color: "#f97316", fontSize: 16 }}>📤 Share Your Referral Link</h3>
              <div style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px", marginBottom: 12, wordBreak: "break-all" as const, fontSize: 12, color: "#94a3b8", border: "1px solid #334155" }}>
                {referralLink}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={copyLink}
                  style={{ flex: 1, background: copied ? "#16a34a" : "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
                <button onClick={shareWhatsApp}
                  style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  📱 WhatsApp
                </button>
              </div>
            </div>

            {/* Task Progress */}
            {currentTask && (
              <div style={{ background: "#1e293b", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, color: "#818cf8", fontSize: 15 }}>🎯 Current Task #{currentTask.taskNumber}</h3>
                  <span style={{ background: "#312e81", color: "#a5b4fc", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>+₹{currentTask.bonusPerReferral}/referral</span>
                </div>
                <p style={{ margin: "0 0 10px", color: "#94a3b8", fontSize: 13 }}>
                  Get <strong style={{ color: "#fff" }}>{currentTask.targetReferrals} referrals</strong> to complete this task!
                </p>
                <div style={{ background: "#0f172a", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${taskProgress}%`, background: "linear-gradient(90deg, #f97316, #fbbf24)", borderRadius: 8, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
                  <span>{referrer.totalReferrals || 0} done</span>
                  <span>{taskProgress}% complete</span>
                  <span>{currentTask.targetReferrals} target</span>
                </div>
              </div>
            )}

            {/* How to Earn */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", color: "#f97316", fontSize: 15 }}>💡 How to Earn</h3>
              {[
                { icon: "1️⃣", title: "Share your link", desc: "Send to friends, family & neighbors", earn: "" },
                { icon: "2️⃣", title: "They chat with bot", desc: "Customer completes solar estimate", earn: "₹500" },
                { icon: "3️⃣", title: "They install solar", desc: "Installation confirmed by AB SOLAR", earn: "₹1,500" },
                { icon: "🎯", title: "Complete tasks", desc: "Hit milestones for extra bonuses", earn: "Up to ₹100 extra" },
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
                  { label: "Signup Bonuses", value: `₹${(Number(referrer.totalReferrals || 0) * 500).toLocaleString()}`, color: "#60a5fa" },
                  { label: "Install Bonuses", value: `₹${(completedReferrals * 1500).toLocaleString()}`, color: "#a78bfa" },
                  { label: "Pending Installs", value: pendingReferrals.toString(), color: "#fb923c" },
                  { label: "Potential Earn", value: `₹${(pendingReferrals * 1500).toLocaleString()}`, color: "#4ade80" },
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

        {/* REFERRALS TAB */}
        {activeTab === "referrals" && (
          <div>
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", color: "#f97316", fontSize: 15 }}>👥 People You Referred</h3>
              {!referrals || referrals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                  <p style={{ color: "#94a3b8", margin: "0 0 8px", fontWeight: 600 }}>No referrals yet!</p>
                  <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>Share your link to start earning. Every person who chats earns you ₹500!</p>
                  <button onClick={shareWhatsApp}
                    style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600 }}>
                    📱 Share on WhatsApp
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {referrals.map((r: any, i: number) => (
                    <div key={i} style={{ background: "#0f172a", borderRadius: 10, padding: 14, border: "1px solid #1e293b" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{r.customerName || "Anonymous"}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{r.customerEmail || r.customerPhone || "—"}</p>
                        </div>
                        <span style={{
                          background: r.status === "completed" ? "rgba(74,222,128,0.15)" : "rgba(251,146,60,0.15)",
                          color: r.status === "completed" ? "#4ade80" : "#fb923c",
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600
                        }}>
                          {r.status === "completed" ? "✅ Installed" : "⏳ Pending"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#64748b", flexWrap: "wrap" as const }}>
                        {r.monthlyBill && <span>💡 ₹{r.monthlyBill}/mo</span>}
                        {r.state && <span>📍 {r.state}</span>}
                        <span style={{ color: r.signupBonusPaid ? "#4ade80" : "#64748b" }}>
                          {r.signupBonusPaid ? "✅ ₹500 paid" : "⏳ ₹500 pending"}
                        </span>
                        {r.status === "completed" && <span style={{ color: "#4ade80" }}>✅ ₹1,500 paid</span>}
                      </div>
                    </div>
                  ))}
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
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", color: "#f97316", fontSize: 15 }}>🎯 Your Tasks</h3>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>Complete tasks to unlock higher bonus rates per referral!</p>
              {!tasks || tasks.length === 0 ? (
                <p style={{ textAlign: "center", color: "#64748b", padding: "20px 0" }}>No tasks yet. Make your first referral to unlock tasks!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                  {tasks.map((task: any, i: number) => {
                    const isActive = i === tasks.length - 1;
                    const isDone = Number(referrer.totalReferrals || 0) >= Number(task.targetReferrals);
                    const prog = Math.min(100, Math.round((Number(referrer.totalReferrals || 0) / Number(task.targetReferrals)) * 100));
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
                              <div style={{ height: "100%", width: `${prog}%`, background: isDone ? "#16a34a" : "linear-gradient(90deg, #f97316, #fbbf24)", borderRadius: 6 }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{referrer.totalReferrals || 0} / {task.targetReferrals} referrals — {prog}%</p>
                          </>
                        )}
                        {!isActive && isDone && <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>✅ Completed</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Milestones */}
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", color: "#818cf8", fontSize: 15 }}>🏆 Milestone Bonuses</h3>
              {[
                { referrals: 5, bonus: "₹500 bonus", label: "Starter" },
                { referrals: 10, bonus: "₹1,000 bonus", label: "Rising Star" },
                { referrals: 15, bonus: "₹2,000 bonus", label: "Champion" },
                { referrals: 25, bonus: "₹5,000 bonus", label: "Legend" },
              ].map((m, i) => {
                const achieved = Number(referrer.totalReferrals || 0) >= m.referrals;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#0f172a", borderRadius: 8, border: `1px solid ${achieved ? "#16a34a" : "#1e293b"}`, marginBottom: i < 3 ? 8 : 0 }}>
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
                  style={{ background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", cursor: "pointer", fontWeight: 600, fontSize: 15, opacity: withdrawMutation.isPending ? 0.7 : 1 }}>
                  {withdrawMutation.isPending ? "Submitting..." : "Request Withdrawal"}
                </button>
              </div>
            </div>

            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", color: "#f97316", fontSize: 15 }}>📋 Withdrawal History</h3>
              {!withdrawals || withdrawals.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No withdrawal requests yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {withdrawals.map((w: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: 8, padding: "12px 14px" }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>₹{Number(w.amount).toLocaleString()}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{w.upiId}</p>
                      </div>
                      <span style={{
                        padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: w.status === "approved" ? "rgba(74,222,128,0.15)" : w.status === "pending" ? "rgba(251,146,60,0.15)" : "rgba(239,68,68,0.15)",
                        color: w.status === "approved" ? "#4ade80" : w.status === "pending" ? "#fb923c" : "#f87171"
                      }}>
                        {w.status === "approved" ? "✅ Approved" : w.status === "pending" ? "⏳ Pending" : "❌ Rejected"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
