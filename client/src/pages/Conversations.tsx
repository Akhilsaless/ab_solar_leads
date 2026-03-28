import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare, Phone, Mail, MapPin, IndianRupee,
  Clock, ArrowRight, Search, Filter
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Conversations() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: conversations, isLoading } = trpc.conversations.list.useQuery();
  const { data: stats } = trpc.conversations.stats.useQuery();

  const filtered = (conversations || []).filter((conv: any) => {
    if (statusFilter !== "all" && conv.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (conv.customerName || "").toLowerCase().includes(q) ||
        (conv.customerPhone || "").toLowerCase().includes(q) ||
        (conv.customerEmail || "").toLowerCase().includes(q) ||
        (conv.customerState || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statuses = [
    { value: "all", label: "All", count: stats?.total || 0 },
    { value: "active", label: "Active", count: stats?.active || 0 },
    { value: "lead_captured", label: "Lead Captured", count: stats?.leadsCaptured || 0 },
    { value: "estimate_given", label: "Estimate Given", count: stats?.estimatesGiven || 0 },
    { value: "converted", label: "Converted", count: stats?.converted || 0 },
    { value: "dropped", label: "Dropped", count: stats?.dropped || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground mt-1">All customer interactions with your AI sales bot</p>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Search by name, phone, email, or state..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Conversation List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium">No conversations found</p>
          <p className="text-sm mt-1">Share your bot link to start getting customer conversations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((conv: any) => (
            <Card
              key={conv.id}
              className="cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => setLocation(`/conversations/${conv.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-primary">
                      {(conv.customerName || "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {conv.customerName || "Unknown Visitor"}
                      </h3>
                      <StatusBadge status={conv.status} />
                      {conv.leadScore > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Score: {conv.leadScore}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {conv.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {conv.customerPhone}
                        </span>
                      )}
                      {conv.customerEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {conv.customerEmail}
                        </span>
                      )}
                      {conv.customerState && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {conv.customerCity ? `${conv.customerCity}, ` : ""}{conv.customerState}
                        </span>
                      )}
                      {conv.monthlyBill && (
                        <span className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3" /> ₹{conv.monthlyBill}/mo
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {conv.messageCount || 0} msgs
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(conv.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {conv.netCost && (
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="text-green-400">System: {conv.recommendedKw}kW</span>
                        <span className="text-amber-400">Net Cost: ₹{Number(conv.netCost).toLocaleString("en-IN")}</span>
                        <span className="text-emerald-400">Savings: ₹{Number(conv.estimatedSavingsMonthly).toLocaleString("en-IN")}/mo</span>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-400",
    lead_captured: "bg-green-500/10 text-green-400",
    estimate_given: "bg-amber-500/10 text-amber-400",
    converted: "bg-emerald-500/10 text-emerald-400",
    dropped: "bg-red-500/10 text-red-400",
  };
  const labels: Record<string, string> = {
    active: "Active",
    lead_captured: "Lead Captured",
    estimate_given: "Estimate Given",
    converted: "Converted",
    dropped: "Dropped",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[status] || styles.active}`}>
      {labels[status] || status}
    </span>
  );
}
