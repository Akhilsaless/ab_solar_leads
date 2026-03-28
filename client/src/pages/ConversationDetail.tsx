import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Phone, Mail, MapPin, IndianRupee, Sun,
  Zap, Clock, MessageSquare, User, CheckCircle2, XCircle
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

export default function ConversationDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const convId = Number(params.id);

  const { data, isLoading } = trpc.conversations.getById.useQuery({ id: convId });
  const updateStatus = trpc.conversations.updateStatus.useMutation({
    onSuccess: () => toast.success("Status updated"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-48 bg-secondary animate-pulse rounded" />
        <div className="h-64 bg-secondary animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Conversation not found</p>
        <Button variant="ghost" onClick={() => setLocation("/conversations")} className="mt-4">
          Back to Conversations
        </Button>
      </div>
    );
  }

  const conv = data.conversation;
  const messages = data.messages || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/conversations")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{conv.customerName || "Unknown Visitor"}</h1>
          <p className="text-sm text-muted-foreground">
            Started {new Date(conv.createdAt).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`status-badge status-${conv.status}`}>{conv.status}</span>
          {conv.status === "active" && (
            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: conv.id, status: "lead_captured" })}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Capture Lead
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat Messages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Chat Transcript ({messages.length} messages)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {messages.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "assistant"
                          ? "bg-secondary text-foreground rounded-bl-sm"
                          : "solar-gradient text-black rounded-br-sm"
                      }`}>
                        {msg.role === "assistant" ? (
                          <div className="text-sm prose prose-invert prose-sm max-w-none">
                            <Streamdown>{msg.content}</Streamdown>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        <p className={`text-[10px] mt-1 ${msg.role === "assistant" ? "text-muted-foreground" : "text-black/60"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conv.customerName && <InfoRow icon={User} label="Name" value={conv.customerName} />}
              {conv.customerPhone && <InfoRow icon={Phone} label="Phone" value={conv.customerPhone} />}
              {conv.customerEmail && <InfoRow icon={Mail} label="Email" value={conv.customerEmail} />}
              {conv.customerCity && <InfoRow icon={MapPin} label="Location" value={`${conv.customerCity}${conv.customerState ? `, ${conv.customerState}` : ""}`} />}
              {conv.monthlyBill && <InfoRow icon={IndianRupee} label="Monthly Bill" value={`₹${Number(conv.monthlyBill).toLocaleString("en-IN")}`} />}
              {conv.monthlyUnits && <InfoRow icon={Zap} label="Monthly Units" value={`${conv.monthlyUnits} kWh`} />}
              {!conv.customerPhone && !conv.customerEmail && (
                <p className="text-xs text-muted-foreground">No contact info captured yet</p>
              )}
            </CardContent>
          </Card>

          {/* Solar Estimate */}
          {conv.recommendedKw && (
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-primary" /> Solar Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <EstimateRow label="System Size" value={`${conv.recommendedKw} kW`} />
                {conv.recommendedPanels && <EstimateRow label="Panels" value={`${conv.recommendedPanels} panels`} />}
                {conv.estimatedCost && <EstimateRow label="Total Cost" value={`₹${Number(conv.estimatedCost).toLocaleString("en-IN")}`} />}
                {conv.subsidyAmount && <EstimateRow label="Subsidy" value={`-₹${Number(conv.subsidyAmount).toLocaleString("en-IN")}`} highlight="green" />}
                {conv.netCost && (
                  <div className="border-t border-border pt-2">
                    <EstimateRow label="Net Cost" value={`₹${Number(conv.netCost).toLocaleString("en-IN")}`} highlight="primary" bold />
                  </div>
                )}
                {conv.estimatedSavingsMonthly && <EstimateRow label="Monthly Savings" value={`₹${Number(conv.estimatedSavingsMonthly).toLocaleString("en-IN")}`} highlight="green" />}
                {conv.paybackYears && <EstimateRow label="Payback Period" value={`${conv.paybackYears} years`} />}
              </CardContent>
            </Card>
          )}

          {/* Session Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div><span className="text-muted-foreground">Session:</span> {conv.sessionId.slice(0, 12)}...</div>
              <div><span className="text-muted-foreground">Messages:</span> {conv.messageCount || messages.length}</div>
              <div><span className="text-muted-foreground">Created:</span> {new Date(conv.createdAt).toLocaleString("en-IN")}</div>
              <div><span className="text-muted-foreground">Updated:</span> {new Date(conv.updatedAt).toLocaleString("en-IN")}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EstimateRow({ label, value, highlight, bold }: { label: string; value: string; highlight?: string; bold?: boolean }) {
  const colorClass = highlight === "green" ? "text-green-400" : highlight === "primary" ? "text-primary" : "";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${colorClass} ${bold ? "font-bold text-base" : "font-medium"}`}>{value}</span>
    </div>
  );
}
