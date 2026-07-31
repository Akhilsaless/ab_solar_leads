import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, AlertTriangle, Users, TrendingUp, Clock, Wallet,
  UserCheck, ChevronRight, Send, RefreshCw
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const PRIORITY_ICONS: Record<string, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

const TYPE_ICONS: Record<string, string> = {
  lead: "👤",
  commission: "💰",
  associate: "🤝",
};

export default function Copilot() {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } =
    trpc.copilot.getDailySummary.useQuery(undefined, { staleTime: 120000 });

  const { data: recommendations, isLoading: recsLoading, refetch: refetchRecs } =
    trpc.copilot.getPriorityRecommendations.useQuery(undefined, { staleTime: 120000 });

  const askMutation = trpc.copilot.askCopilot.useMutation({
    onSuccess: (data) => {
      const answer = typeof data.answer === "string" ? data.answer : String(data.answer ?? "");
      setChatHistory(prev => [...prev, { role: "assistant", content: answer }]);
    },
  });

  const handleAsk = () => {
    if (!question.trim()) return;
    setChatHistory(prev => [...prev, { role: "user", content: question }]);
    askMutation.mutate({ question });
    setQuestion("");
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchRecs();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Copilot</h1>
            <p className="text-sm text-muted-foreground">Your daily business intelligence dashboard</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Daily Summary Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Summary</h2>
        {summaryLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-8 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
              label="New Leads Today"
              value={summary.newLeadsToday}
              accent="emerald"
            />
            <SummaryCard
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              label="Urgent Leads"
              value={summary.urgentLeads}
              accent={summary.urgentLeads > 0 ? "red" : "muted"}
            />
            <SummaryCard
              icon={<Users className="h-4 w-4 text-orange-500" />}
              label="Unassigned"
              value={summary.unassignedLeads}
              accent={summary.unassignedLeads > 0 ? "orange" : "muted"}
            />
            <SummaryCard
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
              label="Follow-ups Due"
              value={summary.followUpsDue}
              accent={summary.followUpsDue > 0 ? "yellow" : "muted"}
            />
            <SummaryCard
              icon={<Wallet className="h-4 w-4 text-purple-500" />}
              label="Pending Payouts"
              value={summary.pendingWithdrawals}
              accent={summary.pendingWithdrawals > 0 ? "purple" : "muted"}
            />
            <SummaryCard
              icon={<UserCheck className="h-4 w-4 text-blue-500" />}
              label="New Associates"
              value={summary.newAssociatesToday}
              accent="blue"
            />
          </div>
        ) : (
          <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Could not load summary. Check your connection.</CardContent></Card>
        )}
      </div>

      {/* Priority Recommendations */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Priority Actions</h2>
        {recsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <Card key={i} className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{TYPE_ICONS[rec.type] || "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{rec.record}</span>
                        <Badge variant={PRIORITY_COLORS[rec.priority] as "destructive" | "secondary" | "outline" | "default"} className="text-xs">
                          {PRIORITY_ICONS[rec.priority]} {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{rec.reason}</p>
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <ChevronRight className="h-3 w-3" />
                        <span>{rec.nextStep}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-medium">All clear!</p>
              <p className="text-sm text-muted-foreground mt-1">No priority actions right now. Check back later.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ask Copilot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ask Your Copilot
          </CardTitle>
          <p className="text-xs text-muted-foreground">Ask anything about your leads, associates, or business performance.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto rounded-lg border p-3 bg-muted/20">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border text-card-foreground"
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {askMutation.isPending && (
                <div className="flex gap-2 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                  </div>
                  <div className="bg-card border rounded-xl px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested Prompts */}
          {chatHistory.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Which leads should I prioritize today?",
                "How many leads came in this week?",
                "Which associates are performing best?",
                "What's my conversion rate this month?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setQuestion(prompt)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
              placeholder="Ask about your leads, associates, or performance..."
              className="flex-1 text-sm"
              disabled={askMutation.isPending}
            />
            <Button
              onClick={handleAsk}
              disabled={!question.trim() || askMutation.isPending}
              size="sm"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  const accentMap: Record<string, string> = {
    emerald: "text-emerald-500",
    red: "text-red-500",
    orange: "text-orange-500",
    yellow: "text-yellow-500",
    purple: "text-purple-500",
    blue: "text-blue-500",
    muted: "text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${accentMap[accent] || "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
