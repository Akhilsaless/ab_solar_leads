import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function VerifyReferral() {
  const [token, setToken] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "waiting">("waiting");
  const [referrerName, setReferrerName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
  }, []);

  const verifyMutation = trpc.referrer.verifyCustomer.useMutation({
    onSuccess: (data: any) => {
      setReferrerName(data.referrerName || "your referrer");
      setStatus("success");
    },
    onError: () => setStatus("error"),
  });

  useEffect(() => {
    if (token) {
      setStatus("loading");
      verifyMutation.mutate({ token });
    }
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" as const }}>
        {status === "loading" && (
          <>
            <div style={{ width: 56, height: 56, border: "4px solid #10b981", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ color: "#94a3b8", fontSize: 16 }}>Verifying your referral...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === "success" && (
          <div style={{ background: "#141414", borderRadius: 16, padding: "40px 28px", border: "1px solid #10b981" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: "#22c55e", margin: "0 0 12px", fontSize: 22 }}>Referral Confirmed!</h2>
            <p style={{ color: "#94a3b8", margin: "0 0 20px", fontSize: 15 }}>
              Thank you! You've confirmed that <strong style={{ color: "#fff" }}>{referrerName}</strong> referred you to AB SOLAR.
            </p>
            <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e", borderRadius: 10, padding: "14px 18px", marginBottom: 24 }}>
              <p style={{ margin: 0, color: "#86efac", fontSize: 14 }}>
                Our team will contact you shortly to schedule a free site inspection and solar estimate. 🌞
              </p>
            </div>
            <a href="/" style={{ background: "#10b981", color: "#000", padding: "12px 28px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>
              Learn More About Solar
            </a>
          </div>
        )}

        {status === "error" && (
          <div style={{ background: "#141414", borderRadius: 16, padding: "40px 28px", border: "1px solid #ef4444" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: "#f87171", margin: "0 0 12px", fontSize: 22 }}>Link Invalid or Expired</h2>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: 15 }}>
              This verification link is invalid or has already been used. Please contact the person who referred you for assistance.
            </p>
          </div>
        )}

        {status === "waiting" && (
          <p style={{ color: "#64748b" }}>Loading...</p>
        )}
      </div>
    </div>
  );
}
