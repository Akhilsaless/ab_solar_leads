import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { SalesSquadLogo } from "@/components/SalesSquadLogo";

export default function ReferrerSignup() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState<"form" | "otp" | "password" | "success">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [error, setError] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [acceptedTnC, setAcceptedTnC] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const agencySlugQuery = trpc.agency.getFirst.useQuery();
  const agencySlug = agencySlugQuery.data || "demo";

  // Auto-login if session token exists
  useEffect(() => {
    const code = localStorage.getItem("referrerCode");
    const token = localStorage.getItem("referrerToken");
    if (code && token) {
      setLocation(`/referrer/dashboard?code=${code}`);
    }
  }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; }), 1000);
  };
  const sendOtp = trpc.referrer.sendOtp.useMutation({
    onSuccess: () => { setStep("otp"); setError(""); startCooldown(); },
    onError: (err: any) => setError(err.message || "Failed to send OTP"),
  });
  const resendOtp = trpc.referrer.sendOtp.useMutation({
    onSuccess: () => { setError(""); startCooldown(); },
    onError: (err: any) => setError(err.message || "Failed to resend OTP"),
  });

  const verifyOtp = trpc.referrer.verifyOtpAndSignup.useMutation({
    onSuccess: (data: any) => {
      setUniqueCode(data.uniqueCode);
      if (data.token) {
        localStorage.setItem("referrerCode", data.uniqueCode);
        localStorage.setItem("referrerToken", data.token);
        localStorage.setItem("referrerEmail", email);
        setLocation(`/referrer/dashboard?code=${data.uniqueCode}`);
      } else if (data.needsPassword && data.setupToken) {
        setSetupToken(data.setupToken);
        setStep("password");
      }
      setError("");
    },
    onError: (err: any) => setError(err.message || "Invalid OTP"),
  });

  const setPasswordMutation = trpc.referrer.setPassword.useMutation({
    onSuccess: (data: any) => {
      localStorage.setItem("referrerCode", data.uniqueCode);
      localStorage.setItem("referrerToken", data.token);
      localStorage.setItem("referrerEmail", email);
      setUniqueCode(data.uniqueCode);
      setStep("success");
      setError("");
    },
    onError: (err: any) => setError(err.message || "Failed to set password"),
  });

  const loginMutation = trpc.referrer.loginWithPassword.useMutation({
    onSuccess: (data: any) => {
      localStorage.setItem("referrerCode", data.uniqueCode);
      localStorage.setItem("referrerToken", data.token);
      localStorage.setItem("referrerEmail", loginEmail);
      setLocation(`/referrer/dashboard?code=${data.uniqueCode}`);
    },
    onError: (err: any) => setError(err.message || "Login failed"),
  });

  const handleSendOtp = () => {
    if (!name || !email) { setError("Please fill all fields"); return; }
    if (!acceptedTnC) { setError("Please accept the Terms & Conditions to continue"); return; }
    setError("");
    sendOtp.mutate({ name, email, acceptedTnC });
  };

  const handleVerifyOtp = () => {
    if (!otp) { setError("Please enter OTP"); return; }
    setError("");
    verifyOtp.mutate({ email, otp });
  };

  const handleSetPassword = () => {
    if (!password || password.length < 10) { setError("Password must be at least 10 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!setupToken) { setError("Password setup expired. Please verify your email again."); return; }
    setError("");
    setPasswordMutation.mutate({ setupToken, password });
  };

  const handleLogin = () => {
    if (!loginEmail || !loginPassword) { setError("Please enter email and password"); return; }
    setError("");
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const cardStyle: React.CSSProperties = {
    width: "100%", maxWidth: 420, background: "#141414",
    border: "1px solid rgba(16,185,129,0.3)", borderRadius: 16, padding: 32,
    boxShadow: "0 0 40px rgba(16,185,129,0.08)",
  };

  if (step === "success") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "2px solid #10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
              <CheckCircle style={{ width: 32, height: 32, color: "#10b981" }} />
            </div>
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Welcome to Sales Squad!</h2>
            <p style={{ color: "#888", fontSize: 14, margin: 0 }}>Your account is ready. Share your link to start earning.</p>
          </div>
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <p style={{ color: "#555", fontSize: 12, margin: "0 0 6px" }}>Your Unique Code:</p>
            <p style={{ color: "#10b981", fontSize: 22, fontWeight: 700, fontFamily: "monospace", margin: 0 }}>{uniqueCode}</p>
          </div>
          <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <p style={{ color: "#555", fontSize: 12, margin: "0 0 6px" }}>Your Referral Link:</p>
            <p style={{ color: "#60a5fa", fontSize: 12, wordBreak: "break-all", fontFamily: "monospace", margin: "0 0 12px" }}>
              {window.location.origin}/chat/{agencySlug}?ref={uniqueCode}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/chat/${agencySlug}?ref=${uniqueCode}`)}
              style={{ width: "100%", background: "#1a1a1a", color: "#fff", border: "1px solid #333", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
              📋 Copy Link
            </button>
          </div>
          <button
            onClick={() => (window.location.href = `/referrer/dashboard?code=${uniqueCode}`)}
            style={{ width: "100%", background: "#10b981", color: "#000", border: "none", borderRadius: 8, padding: "13px 0", cursor: "pointer", fontWeight: 700, fontSize: 15, boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <SalesSquadLogo size={44} />
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "12px 0 4px" }}>Sales Squad</h1>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Referral Partner Program</p>
        </div>

        {/* Tabs — only show when not in OTP/password step */}
        {(step === "form") && (
          <div style={{ display: "flex", background: "#0a0a0a", borderRadius: 10, padding: 4, marginBottom: 24, border: "1px solid #222" }}>
            {(["signup", "login"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s",
                  background: tab === t ? "#10b981" : "transparent",
                  color: tab === t ? "#000" : "#888" }}>
                {t === "signup" ? "Sign Up" : "Log In"}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
            <AlertCircle style={{ width: 16, height: 16, color: "#ef4444", flexShrink: 0 }} />
            <span style={{ color: "#ef4444", fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* ── SIGNUP TAB ── */}
        {tab === "signup" && step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981] focus:ring-[#10b981]" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="your@email.com"
                className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981] focus:ring-[#10b981]" />
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <div onClick={() => setAcceptedTnC(!acceptedTnC)}
                style={{ marginTop: 2, width: 18, height: 18, borderRadius: 4, border: `2px solid ${acceptedTnC ? "#10b981" : "#444"}`, background: acceptedTnC ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", boxShadow: acceptedTnC ? "0 0 8px rgba(16,185,129,0.4)" : "none" }}>
                {acceptedTnC && <CheckCircle style={{ width: 12, height: 12, color: "#000" }} />}
              </div>
              <span style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                I agree to the{" "}
                <Link href="/terms-referral" style={{ color: "#10b981", textDecoration: "underline" }}>
                  Terms & Conditions <ExternalLink style={{ width: 10, height: 10, display: "inline" }} />
                </Link>
                {" "}including the fake lead policy. Fake leads result in permanent suspension and forfeiture of all earnings.
              </span>
            </label>
            <Button onClick={handleSendOtp} disabled={sendOtp.isPending}
              style={{ background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, height: 46, boxShadow: "0 0 20px rgba(16,185,129,0.3)", border: "none" }}
              className="w-full hover:opacity-90">
              {sendOtp.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : "Send OTP"}
            </Button>
          </div>
        )}

        {/* ── OTP STEP ── */}
        {tab === "signup" && step === "otp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "#888", fontSize: 13, margin: 0 }}>OTP sent to <strong style={{ color: "#fff" }}>{email}</strong></p>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Enter OTP</label>
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP"
                className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] text-center text-2xl tracking-widest focus:border-[#10b981]" />
            </div>
            <Button onClick={handleVerifyOtp} disabled={verifyOtp.isPending}
              style={{ background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, height: 46, boxShadow: "0 0 20px rgba(16,185,129,0.3)", border: "none" }}
              className="w-full hover:opacity-90">
              {verifyOtp.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : "Verify OTP"}
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={() => setStep("form")} variant="outline" className="flex-1 border-[#333] text-[#888] hover:bg-[#1a1a1a] hover:text-white">← Back</Button>
              <Button onClick={() => resendOtp.mutate({ name, email, acceptedTnC: true })} disabled={resendCooldown > 0 || resendOtp.isPending} variant="outline"
                className="flex-1 border-[#333] text-[#10b981] hover:bg-[#1a1a1a]">
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resendOtp.isPending ? "Sending..." : "Resend OTP"}
              </Button>
            </div>
          </div>
        )}

        {/* ── SET PASSWORD STEP ── */}
        {tab === "signup" && step === "password" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <p style={{ color: "#10b981", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>✓ Email Verified!</p>
              <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Set a password so you can log in anytime</p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Min 6 characters"
                  className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981] pr-10" />
                <button onClick={() => setShowPassword(!showPassword)} type="button"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#666" }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Confirm Password</label>
              <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="Repeat password"
                className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981]" />
            </div>
            <Button onClick={handleSetPassword} disabled={setPasswordMutation.isPending}
              style={{ background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, height: 46, boxShadow: "0 0 20px rgba(16,185,129,0.3)", border: "none" }}
              className="w-full hover:opacity-90">
              {setPasswordMutation.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : "Set Password & Continue →"}
            </Button>
          </div>
        )}

        {/* ── LOGIN TAB ── */}
        {tab === "login" && step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Email</label>
              <Input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" placeholder="your@email.com"
                className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981] focus:ring-[#10b981]" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} type={showLoginPassword ? "text" : "password"} placeholder="Your password"
                  className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981] pr-10" />
                <button onClick={() => setShowLoginPassword(!showLoginPassword)} type="button"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#666" }}>
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button onClick={handleLogin} disabled={loginMutation.isPending}
              style={{ background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, height: 46, boxShadow: "0 0 20px rgba(16,185,129,0.3)", border: "none" }}
              className="w-full hover:opacity-90">
              {loginMutation.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : "Log In →"}
            </Button>
            <p style={{ color: "#666", fontSize: 12, textAlign: "center", margin: 0 }}>
              Don't have an account?{" "}
              <button onClick={() => { setTab("signup"); setError(""); }} style={{ color: "#10b981", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                Sign Up
              </button>
            </p>
          </div>
        )}

        {/* Earnings info — show only on signup form */}
        {tab === "signup" && step === "form" && (
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 14, marginTop: 20 }}>
            <p style={{ color: "#888", fontSize: 12, margin: 0, lineHeight: 1.8 }}>
              <span style={{ color: "#10b981" }}>✓</span> ₹50 instant signup bonus<br />
              <span style={{ color: "#10b981" }}>✓</span> ₹500 when your referral applies for govt subsidy<br />
              <span style={{ color: "#10b981" }}>✓</span> ₹1,500 when solar is installed<br />
              <span style={{ color: "#10b981" }}>✓</span> Bonus ₹100–₹500+ per referral via daily tasks<br />
              <span style={{ color: "#10b981" }}>✓</span> Auto-payout to UPI/Bank anytime
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
