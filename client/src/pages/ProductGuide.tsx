import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SalesSquadLogo } from "@/components/SalesSquadLogo";
import { trpc } from "@/lib/trpc";

const C = {
  bg: "#0a0a0a",
  surface: "#111111",
  surface2: "#161616",
  border: "#1e1e1e",
  borderGreen: "rgba(16,185,129,0.25)",
  green: "#10b981",
  greenDim: "rgba(16,185,129,0.1)",
  greenGlow: "rgba(16,185,129,0.06)",
  orange: "#f97316",
  orangeDim: "rgba(249,115,22,0.1)",
  blue: "#3b82f6",
  blueDim: "rgba(59,130,246,0.1)",
  purple: "#8b5cf6",
  purpleDim: "rgba(139,92,246,0.1)",
  text: "#ffffff",
  muted: "#888888",
  subtle: "#555555",
  yellow: "#fbbf24",
};

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px", ...style }}>
      {children}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ background: `${color}20`, color, border: `1px solid ${color}40`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
      {text}
    </span>
  );
}

function EarnCard({ icon, amount, label, desc, color }: { icon: string; amount: string; label: string; desc: string; color: string }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${color}30`, borderRadius: 16, padding: "24px 20px", textAlign: "center", flex: "1 1 160px", minWidth: 140 }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginBottom: 4 }}>{amount}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{desc}</div>
    </div>
  );
}

function StepBubble({ n, title, desc, color }: { n: string; title: string; desc: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 120px", minWidth: 100, textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${color}20`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color, marginBottom: 10, boxShadow: `0 0 16px ${color}30` }}>
        {n}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

export default function ProductGuide() {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const agencyQuery = trpc.agency.getFirst.useQuery();
  const agencySlug = agencyQuery.data || "demo";
  const chatLink = `${window.location.origin}/chat/${agencySlug}`;
  const referralLink = `${window.location.origin}/referral-landing`;
  const partnerLink = `${window.location.origin}/for-partners`;

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`🌞 *Sales Squad — AI-Powered Solar Lead Platform*\n\nCheck out this platform that helps you:\n• Get free solar estimates in 2 mins\n• Earn ₹1,500 per referral\n• Save on electricity bills\n\n👉 ${window.location.origin}/product-guide`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .fade-up { animation: fadeUp 0.6s ease both; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
      `}</style>

      {/* ── STICKY HEADER ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.borderGreen}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <SalesSquadLogo size={30} showText={true} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => navigate("/referrer-signup")} style={{ background: C.green, color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Start Earning
            </button>
            <button onClick={() => window.open(chatLink, "_blank")} style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              Try Chatbot
            </button>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{ background: `radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.15), transparent)`, padding: "80px 20px 60px", textAlign: "center" }}>
        <Section>
          <div className="fade-up">
            <Badge text="🌞 SOLAR LEAD PLATFORM" color={C.green} />
            <h1 style={{ fontSize: "clamp(32px, 6vw, 60px)", fontWeight: 900, margin: "20px 0 16px", lineHeight: 1.1, letterSpacing: -1 }}>
              India's First AI-Powered<br />
              <span style={{ background: `linear-gradient(90deg, ${C.green}, #34d399, ${C.green})`, backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 3s linear infinite" }}>
                Solar Lead Platform
              </span>
            </h1>
            <p style={{ fontSize: "clamp(15px, 2.5vw, 20px)", color: C.muted, maxWidth: 600, margin: "0 auto 32px", lineHeight: 1.7 }}>
              Sales Squad connects homeowners and businesses who want solar with trusted installation partners — using AI to qualify every lead automatically.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/referrer-signup")} style={{ background: C.green, color: "#000", border: "none", borderRadius: 10, padding: "14px 28px", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: `0 0 30px ${C.green}40` }}>
                💰 Start Earning Now →
              </button>
              <button onClick={() => window.open(chatLink, "_blank")} style={{ background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 28px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                🤖 Try the AI Chatbot
              </button>
              <button onClick={() => navigate("/for-partners")} style={{ background: "transparent", color: C.orange, border: `1px solid ${C.orange}40`, borderRadius: 10, padding: "14px 28px", fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                🏢 Partner With Us
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* ── WHAT IS SALES SQUAD ── */}
      <div style={{ padding: "60px 20px", background: C.surface }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge text="ABOUT" color={C.blue} />
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, margin: "16px 0 12px" }}>What is Sales Squad?</h2>
            <p style={{ color: C.muted, fontSize: 16, maxWidth: 600, margin: "0 auto", lineHeight: 1.7 }}>
              Sales Squad is a complete solar business ecosystem — one platform that serves customers, referrers, and solar installation partners.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { icon: "🤖", title: "AI Chatbot (Agent Klaus)", desc: "Our AI qualifies solar leads 24/7. It calculates ROI, explains government subsidies, and captures customer details — all in a natural conversation. No forms, no calls.", color: C.blue },
              { icon: "👥", title: "Referrer Network", desc: "Anyone can join as a referrer, share their unique link, and earn real money every time someone they refer gets solar installed. Completely passive income.", color: C.green },
              { icon: "🏢", title: "Solar Partner Network", desc: "Verified solar installation companies receive pre-qualified leads directly. They only pay a commission when a customer actually installs solar — zero risk.", color: C.orange },
            ].map((item, i) => (
              <div key={i} style={{ background: C.bg, border: `1px solid ${item.color}25`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: item.color, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ padding: "60px 20px" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge text="THE PROCESS" color={C.purple} />
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, margin: "16px 0 12px" }}>How It Works</h2>
            <p style={{ color: C.muted, fontSize: 16, maxWidth: 500, margin: "0 auto" }}>From first contact to solar installation in 5 simple steps</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", position: "relative" }}>
            <StepBubble n="1" title="Customer Clicks Link" desc="Referrer shares their unique link on WhatsApp, Instagram, or Facebook" color={C.green} />
            <div style={{ alignSelf: "center", color: C.subtle, fontSize: 20, paddingBottom: 30 }}>→</div>
            <StepBubble n="2" title="AI Qualifies Lead" desc="Agent Klaus chats with the customer, calculates savings & explains subsidies" color={C.blue} />
            <div style={{ alignSelf: "center", color: C.subtle, fontSize: 20, paddingBottom: 30 }}>→</div>
            <StepBubble n="3" title="Lead Captured" desc="Customer details saved automatically. Referrer earns ₹20 per verified lead" color={C.purple} />
            <div style={{ alignSelf: "center", color: C.subtle, fontSize: 20, paddingBottom: 30 }}>→</div>
            <StepBubble n="4" title="Subsidy Applied" desc="Partner helps customer apply for PM Surya Ghar subsidy. Referrer earns ₹500" color={C.orange} />
            <div style={{ alignSelf: "center", color: C.subtle, fontSize: 20, paddingBottom: 30 }}>→</div>
            <StepBubble n="5" title="Solar Installed" desc="Installation confirmed. Referrer earns ₹1,500. Partner earns their commission." color={C.yellow} />
          </div>
        </Section>
      </div>

      {/* ── FOR CUSTOMERS ── */}
      <div style={{ padding: "60px 20px", background: C.surface }}>
        <Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40, alignItems: "center" }}>
            <div>
              <Badge text="FOR CUSTOMERS" color={C.blue} />
              <h2 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, margin: "16px 0 14px" }}>Get a Free Solar Estimate in 2 Minutes</h2>
              <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>
                No forms. No sales calls. Just chat with our AI advisor and get a personalized solar savings estimate instantly — for your home or business.
              </p>
              {[
                { icon: "⚡", text: "Instant ROI calculation based on your electricity bill" },
                { icon: "🏛️", text: "PM Surya Ghar subsidy guidance (up to ₹78,000 for 3kW)" },
                { icon: "🏠", text: "Works for residential homes AND commercial properties" },
                { icon: "🔒", text: "No commitment — just information and estimates" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{item.text}</p>
                </div>
              ))}
              <button onClick={() => window.open(chatLink, "_blank")} style={{ marginTop: 20, background: C.blue, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                🤖 Try the Chatbot Free →
              </button>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.borderGreen}`, borderRadius: 20, padding: 28 }}>
              <p style={{ margin: "0 0 16px", color: C.subtle, fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Example Savings</p>
              {[
                { label: "Monthly Electricity Bill", value: "₹5,000", color: C.muted },
                { label: "Recommended System", value: "5 kW Solar", color: C.text },
                { label: "Govt Subsidy (PM Surya Ghar)", value: "₹78,000", color: C.green },
                { label: "Monthly Savings", value: "₹3,500-4,500", color: C.green },
                { label: "Payback Period", value: "3-4 Years", color: C.orange },
                { label: "25-Year Total Savings", value: "₹12+ Lakhs", color: C.yellow },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 5 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ── REFERRER VIDEO ── */}
      <div style={{ padding: "60px 20px", background: C.bg }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Badge text="🎬 WATCH THIS FIRST" color={C.green} />
            <h2 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, margin: "16px 0 10px" }}>See How You Can Earn With Solar</h2>
            <p style={{ color: C.muted, fontSize: 15, maxWidth: 500, margin: "0 auto" }}>Watch this 80-second video to understand exactly how the referral program works</p>
          </div>
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", border: `2px solid ${C.borderGreen}`, boxShadow: `0 0 60px rgba(16,185,129,0.2)` }}>
              <video
                controls
                playsInline
                style={{ width: "100%", display: "block", background: "#000" }}
                poster="https://d2xsxph8kpxj0f.cloudfront.net/310519663486128902/XXxQwsn9S2FCBrsPdEUbzR/referrer_video_ref1-oK93RbBib54P5o29JkuLER.webp"
              >
                <source src="/manus-storage/referrer_recruitment_video_b67c9834.mp4" type="video/mp4" />
              </video>
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button
                onClick={() => navigate("/referrer-signup")}
                style={{ background: C.green, color: "#000", border: "none", borderRadius: 12, padding: "14px 28px", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: `0 0 30px ${C.green}40`, flex: "1 1 180px" }}
              >
                💰 Get Your Referrer Code →
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/product-guide#referrer-video`); }}
                style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", flex: "1 1 140px" }}
              >
                📋 Copy Video Link
              </button>
            </div>
            <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: C.subtle }}>
              salessquadleads.manus.space/product-guide · ₹50 bonus on signup
            </p>
          </div>
        </Section>
      </div>

      {/* ── FOR REFERRERS ── */}
      <div style={{ padding: "60px 20px" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge text="FOR REFERRERS" color={C.green} />
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, margin: "16px 0 12px" }}>Earn Money by Sharing a Link</h2>
            <p style={{ color: C.muted, fontSize: 16, maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              No selling. No experience needed. Just share your unique link on WhatsApp, Instagram, or Facebook and earn every time someone gets solar installed.
            </p>
          </div>

          {/* Earn Cards */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}>
            <EarnCard icon="🎁" amount="₹50" label="Signup Bonus" desc="Credited instantly on joining" color={C.purple} />
            <EarnCard icon="✅" amount="₹20" label="Per Verified Lead" desc="Customer fills the form" color={C.blue} />
            <EarnCard icon="📋" amount="₹500" label="Subsidy Applied" desc="Customer applies for govt subsidy" color={C.orange} />
            <EarnCard icon="🏠" amount="₹1,500" label="Solar Installed" desc="Installation confirmed" color={C.green} />
            <EarnCard icon="🎯" amount="₹100-500" label="Task Bonuses" desc="Hit milestones for extra rewards" color={C.yellow} />
          </div>

          {/* Earning Example */}
          <div style={{ background: C.surface, border: `1px solid ${C.borderGreen}`, borderRadius: 20, padding: 32, marginBottom: 32 }}>
            <h3 style={{ margin: "0 0 20px", color: C.green, fontSize: 18, fontWeight: 700 }}>📊 Real Earning Example</h3>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>If you share your link with 50 people in a month (WhatsApp groups, Instagram, Facebook):</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { scenario: "10 people chat with AI", earn: "₹200", detail: "10 verified leads × ₹20", color: C.blue },
                { scenario: "3 people apply for subsidy", earn: "₹1,500", detail: "3 × ₹500", color: C.orange },
                { scenario: "1 person gets solar installed", earn: "₹1,500", detail: "1 × ₹1,500", color: C.green },
                { scenario: "Task bonuses", earn: "₹200", detail: "Milestone rewards", color: C.yellow },
              ].map((item, i) => (
                <div key={i} style={{ background: C.bg, border: `1px solid ${item.color}20`, borderRadius: 12, padding: 16 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 12, color: C.muted }}>{item.scenario}</p>
                  <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: item.color }}>{item.earn}</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.subtle }}>{item.detail}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, background: `${C.green}10`, border: `1px solid ${C.green}30`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Total earnings in one month</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: C.subtle }}>Just from sharing 50 times</p>
              </div>
              <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: C.green }}>₹3,400+</p>
            </div>
          </div>

          {/* How to Start */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>🚀 How to Start Earning (3 Steps)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {[
                { n: "1", title: "Sign Up Free", desc: "Create your referrer account in 2 minutes. Get ₹50 signup bonus instantly.", icon: "📝", color: C.green },
                { n: "2", title: "Get Your Link", desc: "Receive your unique referral link. Share it anywhere — WhatsApp, Instagram, Facebook.", icon: "🔗", color: C.blue },
                { n: "3", title: "Earn & Withdraw", desc: "Track earnings in your dashboard. Withdraw to UPI/Bank anytime (min ₹70).", icon: "💰", color: C.orange },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${step.color}20`, border: `2px solid ${step.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: step.color, flexShrink: 0, fontSize: 16 }}>
                    {step.n}
                  </div>
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{step.icon} {step.title}</p>
                    <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/referrer-signup")} style={{ marginTop: 24, width: "100%", background: C.green, color: "#000", border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: `0 0 24px ${C.green}30` }}>
              💰 Join as Referrer — It's Free →
            </button>
          </div>
        </Section>
      </div>

      {/* ── FOR SOLAR PARTNERS ── */}
      <div style={{ padding: "60px 20px", background: C.surface }}>
        <Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40, alignItems: "center" }}>
            <div>
              <Badge text="FOR SOLAR PARTNERS" color={C.orange} />
              <h2 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, margin: "16px 0 14px" }}>Get Pre-Qualified Solar Leads Delivered to You</h2>
              <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.8, marginBottom: 20 }}>
                Stop spending on Google Ads and cold calls. We deliver customers who are already interested, already qualified, and already know about the subsidy.
              </p>
              {[
                { icon: "🎯", text: "Only pay commission when a customer actually installs solar" },
                { icon: "🤖", text: "Every lead is AI-qualified — no time wasters" },
                { icon: "📊", text: "Full lead details: location, bill amount, property type, interest level" },
                { icon: "🤝", text: "Split commission model — 50% on subsidy, 50% on installation" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{item.text}</p>
                </div>
              ))}
              <button onClick={() => navigate("/for-partners")} style={{ marginTop: 20, background: C.orange, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                🏢 Become a Partner →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "📍", title: "Hyderabad & Telangana", desc: "Currently serving leads in Hyderabad and expanding across Telangana", color: C.orange },
                { icon: "⚡", title: "Residential & Commercial", desc: "Leads for homes, offices, factories, and commercial properties", color: C.blue },
                { icon: "💰", title: "Commission on Installation", desc: "You earn your margin. We earn ₹3,000-4,000 per kW installed.", color: C.green },
                { icon: "📱", title: "WhatsApp & Email Delivery", desc: "Leads delivered directly to your WhatsApp or email in real-time", color: C.purple },
              ].map((item, i) => (
                <div key={i} style={{ background: C.bg, border: `1px solid ${item.color}20`, borderRadius: 14, padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: item.color }}>{item.title}</p>
                    <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* ── WHY NOW ── */}
      <div style={{ padding: "60px 20px" }}>
        <Section>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge text="THE OPPORTUNITY" color={C.yellow} />
            <h2 style={{ fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 800, margin: "16px 0 12px" }}>Why Solar. Why Now.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {[
              { icon: "🏛️", stat: "₹75,000 Cr", label: "PM Surya Ghar Budget", desc: "Government committed ₹75,000 crore to solar subsidies for 1 crore homes", color: C.green },
              { icon: "⚡", stat: "₹78,000", label: "Max Subsidy Per Home", desc: "Up to ₹78,000 subsidy for a 3kW system under PM Surya Ghar scheme", color: C.orange },
              { icon: "📈", stat: "40%", label: "Annual Growth", desc: "India's solar market growing at 40% annually — fastest in the world", color: C.blue },
              { icon: "🏠", stat: "1 Crore", label: "Target Homes", desc: "Government target to install solar in 1 crore homes by 2027", color: C.purple },
            ].map((item, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${item.color}20`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: item.color, marginBottom: 4 }}>{item.stat}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── SHARE THIS GUIDE ── */}
      <div style={{ padding: "60px 20px", background: C.surface }}>
        <Section>
          <div style={{ background: `linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))`, border: `1px solid ${C.borderGreen}`, borderRadius: 24, padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📤</div>
            <h2 style={{ fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 800, margin: "0 0 12px" }}>Share This Guide</h2>
            <p style={{ color: C.muted, fontSize: 15, maxWidth: 500, margin: "0 auto 28px", lineHeight: 1.7 }}>
              Know someone who wants to earn money, get solar, or partner with us? Share this guide with them.
            </p>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, wordBreak: "break-all", fontSize: 13, color: C.muted, maxWidth: 500, margin: "0 auto 20px" }}>
              {window.location.origin}/product-guide
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { copyLink(`${window.location.origin}/product-guide`); }} style={{ background: copied ? C.green : C.surface2, color: copied ? "#000" : C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}>
                {copied ? "✅ Copied!" : "📋 Copy Link"}
              </button>
              <button onClick={shareWhatsApp} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                📱 Share on WhatsApp
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ padding: "80px 20px", textAlign: "center", background: `radial-gradient(ellipse 80% 60% at 50% 100%, rgba(16,185,129,0.12), transparent)` }}>
        <Section>
          <h2 style={{ fontSize: "clamp(26px, 4.5vw, 44px)", fontWeight: 900, margin: "0 0 16px" }}>
            Ready to Get Started?
          </h2>
          <p style={{ color: C.muted, fontSize: 16, maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Whether you want to earn, save on electricity, or grow your solar business — Sales Squad has a place for you.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/referrer-signup")} style={{ background: C.green, color: "#000", border: "none", borderRadius: 12, padding: "16px 32px", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: `0 0 40px ${C.green}40` }}>
              💰 Start Earning as Referrer
            </button>
            <button onClick={() => window.open(chatLink, "_blank")} style={{ background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 32px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              🤖 Get Free Solar Estimate
            </button>
            <button onClick={() => navigate("/for-partners")} style={{ background: "transparent", color: C.orange, border: `1px solid ${C.orange}40`, borderRadius: 12, padding: "16px 32px", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
              🏢 Partner With Us
            </button>
          </div>
        </Section>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "24px 20px", textAlign: "center" }}>
        <SalesSquadLogo size={28} showText={true} />
        <p style={{ margin: "12px 0 0", fontSize: 12, color: C.subtle }}>
          Sales Squad — AI-Powered Solar Lead Generation Platform · Hyderabad, India
        </p>
      </div>
    </div>
  );
}
