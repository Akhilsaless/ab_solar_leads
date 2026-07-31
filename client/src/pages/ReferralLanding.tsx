import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Users, Gift, Zap, TrendingUp, Shield } from "lucide-react";
import { SalesSquadLogo } from "@/components/SalesSquadLogo";
import { trpc } from "@/lib/trpc";

const G = "#10b981";
const GDIM = "rgba(16,185,129,0.12)";
const GBORDER = "rgba(16,185,129,0.25)";

export default function ReferralLanding() {
  const [, navigate] = useLocation();
  const [referrerCode, setReferrerCode] = useState<string>("");
  const potInfo = trpc.referrer.getPotInfo.useQuery(undefined, { refetchInterval: 30000 });
  const balance = potInfo.data?.balance ?? 10000;
  const recentPayouts = potInfo.data?.recentPayouts ?? [];

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const code = pathParts[pathParts.length - 1];
    if (code && code !== "referral-landing") setReferrerCode(code);
  }, []);

  const steps = [
    { n: "1", title: "Sign Up", desc: "Create your referrer account with OTP" },
    { n: "2", title: "Get Link", desc: "Get your unique referral code" },
    { n: "3", title: "Share", desc: "Send to friends, family & neighbors" },
    { n: "4", title: "They Apply", desc: "Customer applies for govt subsidy" },
    { n: "5", title: "Withdraw", desc: "Payout to UPI/Bank anytime" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "rgba(20,20,20,0.95)", borderBottom: `1px solid ${GBORDER}`, backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SalesSquadLogo size={34} showText={true} />
          <span style={{ color: "#555", fontSize: 13 }}>Referral Commission Program</span>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

        {/* Trust Bar: Pot Balance + Recent Payouts */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "28px 0 0", alignItems: "stretch" }}>
          {/* Pot Balance */}
          <div style={{ flex: "1 1 260px", background: "#141414", border: `1px solid ${GBORDER}`, borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Shield style={{ width: 22, height: 22, color: G }} />
            </div>
            <div>
              <p style={{ margin: 0, color: "#555", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Reward Pool Available</p>
              <p style={{ margin: "4px 0 0", color: G, fontSize: 28, fontWeight: 800 }}>₹{balance.toLocaleString("en-IN")}</p>
              <div style={{ marginTop: 6, height: 4, background: "#222", borderRadius: 4, overflow: "hidden", width: 160 }}>
                <div style={{ height: "100%", background: G, borderRadius: 4, width: `${Math.min(100, (balance / 10000) * 100)}%`, transition: "width 0.5s" }} />
              </div>
            </div>
          </div>

          {/* Recent Payouts Ticker */}
          <div style={{ flex: "2 1 320px", background: "#141414", border: "1px solid #222", borderRadius: 14, padding: "20px 24px", overflow: "hidden" }}>
            <p style={{ margin: "0 0 12px", color: "#555", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Recent Payouts</p>
            {recentPayouts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentPayouts.slice(0, 4).map((p: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#ccc", fontSize: 13 }}>✅ {p.name?.split(" ")[0]} {p.name?.split(" ")[1]?.[0] ? p.name.split(" ")[1][0] + "." : ""}</span>
                    <span style={{ color: G, fontWeight: 700, fontSize: 13 }}>₹{Number(p.amount).toLocaleString("en-IN")} paid</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0" }}>
                  <span style={{ fontSize: 28 }}>🏆</span>
                  <p style={{ color: "#555", fontSize: 13, margin: 0, textAlign: "center" }}>Be the first to earn!</p>
                  <p style={{ color: "#333", fontSize: 11, margin: 0, textAlign: "center" }}>Real payouts will appear here once the program kicks off.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "60px 0 60px" }}>
          <div style={{ display: "inline-block", background: GDIM, border: `1px solid ${GBORDER}`, borderRadius: 20, padding: "6px 16px", marginBottom: 20 }}>
            <span style={{ color: G, fontSize: 13, fontWeight: 600 }}>🌞 Solar Referral Program</span>
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.1 }}>
            Earn <span style={{ color: G }}>₹2,000</span> Per Customer
          </h1>
          <p style={{ color: "#888", fontSize: 18, margin: "0 0 36px", maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Refer customers to Sales Squad and earn ₹500 when they apply for govt subsidy + ₹1,500 when solar is installed.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/referrer-signup")}
              style={{ background: G, color: "#000", border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 0 25px rgba(16,185,129,0.35)` }}>
              Start Earning Now <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
            <button
              onClick={() => navigate(referrerCode ? `/refer/${referrerCode}` : "/chat/demo")}
              style={{ background: "transparent", color: "#fff", border: "1px solid #333", borderRadius: 10, padding: "14px 28px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              Get Solar Estimate
            </button>
          </div>
        </div>

        {/* Earnings Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 60 }}>
          {[
            { icon: <TrendingUp style={{ width: 28, height: 28, color: "#818cf8" }} />, amount: "₹100–₹500+", label: "Task Bonus", sub: "Per referral via daily tasks", color: "#818cf8", dim: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.25)" },
            { icon: <Gift style={{ width: 28, height: 28, color: G }} />, amount: "₹500", label: "Subsidy Bonus", sub: "When referral applies for govt subsidy", color: G, dim: GDIM, border: GBORDER },
            { icon: <Zap style={{ width: 28, height: 28, color: "#fbbf24" }} />, amount: "₹1,500", label: "Install Bonus", sub: "When solar installation is confirmed", color: "#fbbf24", dim: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)" },
          ].map((card, i) => (
            <div key={i} style={{ background: "#141414", border: `1px solid ${card.border}`, borderRadius: 14, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: card.dim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {card.icon}
              </div>
              <h3 style={{ color: card.color, fontSize: 28, fontWeight: 800, margin: "0 0 4px" }}>{card.amount}</h3>
              <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 6px" }}>{card.label}</p>
              <p style={{ color: "#555", fontSize: 13, margin: 0 }}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 16, padding: "40px 36px", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 32px" }}>How It Works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: G, color: "#000", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: `0 0 15px rgba(16,185,129,0.35)` }}>{s.n}</div>
                <h3 style={{ color: "#fff", fontWeight: 600, margin: "0 0 6px", fontSize: 15 }}>{s.title}</h3>
                <p style={{ color: "#555", fontSize: 12, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Two Ways to Earn */}
        <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 16, padding: "40px 36px", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 28px" }}>Two Ways to Earn</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            <div>
              <h3 style={{ color: "#818cf8", fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Way 1 — Task Bonuses</h3>
              <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px" }}>Earn extra per referral by completing daily tasks:</p>
              {[
                { label: "Task 1: 5 Referrals", earn: "₹100 bonus" },
                { label: "Task 2: 10 Referrals", earn: "₹200 bonus" },
                { label: "Task 3: 15 Referrals", earn: "₹300 bonus" },
                { label: "Legend: 25 Referrals", earn: "₹500 bonus" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0a", border: "1px solid #222", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                  <span style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>{row.label}</span>
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>{row.earn}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ color: G, fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Way 2 — Direct Bonuses</h3>
              <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px" }}>Earn when your referral converts to solar:</p>
              {[
                { label: "Govt subsidy applied", earn: "₹500" },
                { label: "Solar installed", earn: "₹1,500" },
                { label: "Total per customer", earn: "₹2,000", highlight: true },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: row.highlight ? GDIM : "#0a0a0a", border: `1px solid ${row.highlight ? GBORDER : "#222"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                  <span style={{ color: "#fff", fontWeight: row.highlight ? 700 : 500, fontSize: 14 }}>{row.label}</span>
                  <span style={{ color: G, fontWeight: 700 }}>{row.earn}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Network pitch */}
        <div style={{ background: "#141414", border: `1px solid ${GBORDER}`, borderRadius: 16, padding: "32px 36px", marginBottom: 60 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: GDIM, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users style={{ width: 24, height: 24, color: G }} />
            </div>
            <div>
              <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Unlimited Earning Potential</h3>
              <p style={{ color: "#666", margin: "0 0 16px", fontSize: 14 }}>Build your network and multiply your earnings. The more quality referrals you send, the higher your task bonuses go.</p>
              <div style={{ background: GDIM, border: `1px solid ${GBORDER}`, borderRadius: 10, padding: "14px 18px" }}>
                <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 8px", fontSize: 14 }}>Example:</p>
                <p style={{ color: "#888", fontSize: 13, margin: 0, lineHeight: 1.7 }}>
                  You refer Raj → he applies for subsidy → <span style={{ color: G }}>you earn ₹500</span><br />
                  Raj's solar gets installed → <span style={{ color: G }}>you earn ₹1,500</span><br />
                  You hit 5 referrals milestone → <span style={{ color: G }}>₹100 bonus</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "20px 0 80px" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 12px" }}>Ready to Start Earning?</h2>
          <p style={{ color: "#666", fontSize: 16, margin: "0 0 28px" }}>Join thousands of referrers earning with Sales Squad</p>
          <button
            onClick={() => navigate("/referrer-signup")}
            style={{ background: G, color: "#000", border: "none", borderRadius: 10, padding: "16px 40px", fontSize: 17, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: `0 0 30px rgba(16,185,129,0.4)` }}>
            Sign Up as Referrer <ArrowRight style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#141414", borderTop: "1px solid #222", padding: "24px", textAlign: "center" }}>
        <p style={{ color: "#444", fontSize: 13, margin: 0 }}>Sales Squad © 2026. All rights reserved. | Referral Program Terms Apply</p>
      </div>
    </div>
  );
}
