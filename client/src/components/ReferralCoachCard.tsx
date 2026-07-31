import { useState } from "react";
import { trpc } from "@/lib/trpc";

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
};

type CoachScreen = "dashboard" | "findleads";

interface ReferralCoachCardProps {
  uniqueCode: string;
  screen: CoachScreen;
}

export function ReferralCoachCard({ uniqueCode, screen }: ReferralCoachCardProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [showAsk, setShowAsk] = useState(false);

  const { data: card, isLoading } = trpc.referralCoach.getCoachCard.useQuery(
    { uniqueCode, screen },
    { enabled: !!uniqueCode, staleTime: 60000 }
  );

  const { data: mission } = trpc.referralCoach.getTodaysMission.useQuery(
    { uniqueCode },
    { enabled: !!uniqueCode, staleTime: 60000 }
  );

  const askMutation = trpc.referralCoach.askCoach.useMutation({
    onSuccess: (data) => {
      const text = typeof data.answer === "string" ? data.answer : String(data.answer ?? "");
      setAnswer(text);
      setQuestion("");
    },
  });

  if (isLoading) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.borderGreen}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.greenDim }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, background: C.surface2, borderRadius: 6, marginBottom: 6, width: "60%" }} />
            <div style={{ height: 10, background: C.surface2, borderRadius: 6, width: "80%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div style={{ background: `linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))`, border: `1px solid ${C.borderGreen}`, borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: `0 0 20px ${C.greenGlow}` }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.greenDim, border: `1.5px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, color: C.green, fontSize: 13 }}>AI Coach</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.subtle }}>{card.title}</p>
        </div>
      </div>

      {/* Today's Mission */}
      {mission && (
        <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.orange }}>🎯 Today's Mission</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.subtle }}>{mission.mission}</p>
          {mission.tip && (
            <p style={{ margin: "4px 0 0", fontSize: 11, color: C.green, fontWeight: 600 }}>💡 {mission.tip}</p>
          )}
        </div>
      )}

      {/* Main Tip */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.subtle, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{card.body}</p>
      </div>

      {/* Reminder */}
      {card.reminder && (
        <div style={{ background: "rgba(16,185,129,0.06)", border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, color: C.green }}>💡 {card.reminder}</p>
        </div>
      )}

      {/* Ask Coach Toggle */}
      <button
        onClick={() => setShowAsk(!showAsk)}
        style={{ background: "transparent", border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", color: C.green, fontSize: 12, fontWeight: 600, width: "100%", textAlign: "left" as const }}
      >
        💬 Ask your AI Coach anything...
      </button>

      {showAsk && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && question.trim()) {
                  askMutation.mutate({ uniqueCode, question });
                }
              }}
              placeholder="e.g. How do I convince someone to switch to solar?"
              style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 12, outline: "none" }}
            />
            <button
              onClick={() => { if (question.trim()) askMutation.mutate({ uniqueCode, question }); }}
              disabled={!question.trim() || askMutation.isPending}
              style={{ background: C.green, color: "#000", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12, opacity: (!question.trim() || askMutation.isPending) ? 0.5 : 1 }}
            >
              {askMutation.isPending ? "..." : "Ask"}
            </button>
          </div>
          {answer && (
            <div style={{ marginTop: 10, background: C.surface2, border: `1px solid ${C.borderGreen}`, borderRadius: 8, padding: "10px 12px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: C.green, fontWeight: 600 }}>🤖 Coach says:</p>
              <p style={{ margin: 0, fontSize: 12, color: C.subtle, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
