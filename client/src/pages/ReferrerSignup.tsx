import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { SalesSquadLogo } from "@/components/SalesSquadLogo";

export default function ReferrerSignup() {
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const [acceptedTnC, setAcceptedTnC] = useState(false);

  const sendOtp = trpc.referrer.sendOtp.useMutation({
    onSuccess: () => { setStep("otp"); setError(""); },
    onError: (err: any) => setError(err.message || "Failed to send OTP"),
  });

  const verifyOtp = trpc.referrer.verifyOtpAndSignup.useMutation({
    onSuccess: (data: any) => {
      setUniqueCode(data.uniqueCode);
      localStorage.setItem("referrerCode", data.uniqueCode);
      localStorage.setItem("referrerEmail", email);
      setStep("success");
      setError("");
    },
    onError: (err: any) => setError(err.message || "Invalid OTP"),
  });

  const handleSendOtp = () => {
    if (!name || !email) { setError("Please fill all fields"); return; }
    if (!acceptedTnC) { setError("Please accept the Terms & Conditions to continue"); return; }
    sendOtp.mutate({ name, email, acceptedTnC });
  };

  const handleVerifyOtp = () => {
    if (!otp) { setError("Please enter OTP"); return; }
    verifyOtp.mutate({ email, otp });
  };

  if (step === "success") {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 420, background: "#141414", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 16, padding: 32, boxShadow: "0 0 40px rgba(16,185,129,0.08)" }}>
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
              {window.location.origin}/referral-landing/{uniqueCode}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/referral-landing/${uniqueCode}`)}
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
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <SalesSquadLogo size={40} showText={true} />
        </div>

        <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 16, padding: 32, boxShadow: "0 0 40px rgba(16,185,129,0.05)" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>Earn with Sales Squad</h1>
            <p style={{ color: "#888", fontSize: 14, margin: 0 }}>Refer customers and earn ₹500–₹1,500 per referral</p>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertCircle style={{ width: 16, height: 16, color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {step === "form" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981] focus:ring-[#10b981]"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="your@email.com"
                  className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] focus:border-[#10b981] focus:ring-[#10b981]"
                />
              </div>

              {/* T&C Checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <div
                  onClick={() => setAcceptedTnC(!acceptedTnC)}
                  style={{ marginTop: 2, width: 18, height: 18, borderRadius: 4, border: `2px solid ${acceptedTnC ? "#10b981" : "#444"}`, background: acceptedTnC ? "#10b981" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s", boxShadow: acceptedTnC ? "0 0 8px rgba(16,185,129,0.4)" : "none" }}
                >
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

              <Button
                onClick={handleSendOtp}
                disabled={sendOtp.isPending}
                style={{ background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, height: 46, boxShadow: "0 0 20px rgba(16,185,129,0.3)", border: "none" }}
                className="w-full hover:opacity-90"
              >
                {sendOtp.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : "Send OTP"}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ color: "#888", fontSize: 13, margin: 0 }}>OTP sent to <strong style={{ color: "#fff" }}>{email}</strong></p>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#aaa", marginBottom: 6 }}>Enter OTP</label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#444] text-center text-2xl tracking-widest focus:border-[#10b981]"
                />
              </div>
              <Button
                onClick={handleVerifyOtp}
                disabled={verifyOtp.isPending}
                style={{ background: "#10b981", color: "#000", fontWeight: 700, fontSize: 15, height: 46, boxShadow: "0 0 20px rgba(16,185,129,0.3)", border: "none" }}
                className="w-full hover:opacity-90"
              >
                {verifyOtp.isPending ? <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> : "Verify & Signup"}
              </Button>
              <Button onClick={() => setStep("form")} variant="outline" className="w-full border-[#333] text-[#888] hover:bg-[#1a1a1a] hover:text-white">
                ← Back
              </Button>
            </div>
          )}

          {/* Earnings info */}
          <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 14, marginTop: 20 }}>
            <p style={{ color: "#888", fontSize: 12, margin: 0, lineHeight: 1.8 }}>
              <span style={{ color: "#10b981" }}>✓</span> ₹500 when your referral applies for govt subsidy<br />
              <span style={{ color: "#10b981" }}>✓</span> ₹1,500 when solar is installed<br />
              <span style={{ color: "#10b981" }}>✓</span> Bonus ₹100–₹500+ per referral via daily tasks<br />
              <span style={{ color: "#10b981" }}>✓</span> Auto-payout to UPI/Bank anytime
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
