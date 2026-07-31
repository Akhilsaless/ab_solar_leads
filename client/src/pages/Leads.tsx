import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Search, Mail, Phone, MoreHorizontal,
  Eye, ArrowUpDown, MapPin, Zap, Star, Clock, Activity,
  X, FileText, ChevronRight, Sparkles, Calendar
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Trash2, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];
const PROPERTY_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "residential", label: "🏠 Residential" },
  { value: "commercial", label: "🏢 Commercial" },
];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500",
  contacted: "bg-yellow-500/10 text-yellow-500",
  qualified: "bg-purple-500/10 text-purple-500",
  converted: "bg-green-500/10 text-green-500",
  lost: "bg-red-500/10 text-red-500",
};

const ACTIVITY_ICONS: Record<string, any> = {
  created: Users,
  status_changed: ArrowUpDown,
  note_added: FileText,
  email_sent: Mail,
  call_made: Phone,
  assigned: Star,
  default: Activity,
};

function LeadDetailSheet({ lead, onClose }: { lead: any; onClose: () => void }) {
  const activity = trpc.leads.activity.useQuery({ leadId: lead.id });
  const [noteText, setNoteText] = useState("");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const addNote = trpc.leads.update.useMutation({
    onSuccess: () => {
      activity.refetch();
      setNoteText("");
      toast.success("Note added");
    },
  });

  const generateSummary = async () => {
    setSummaryLoading(true);
    // Build a simple summary from lead data
    const parts = [
      `${lead.firstName} ${lead.lastName}`,
      lead.phone ? `Phone: ${lead.phone}` : null,
      lead.email ? `Email: ${lead.email}` : null,
      lead.state ? `Location: ${lead.city ? lead.city + ", " : ""}${lead.state}` : null,
      lead.monthlyEnergyBill ? `Monthly Bill: ₹${lead.monthlyEnergyBill}` : null,
      lead.homeownershipType ? `Property: ${lead.homeownershipType}` : null,
      `Status: ${lead.status}`,
      `Lead Score: ${lead.leadScore}/100`,
      lead.referrerCode ? `Referred by: ${lead.referrerCode}` : null,
    ].filter(Boolean);
    // Simulate AI summary generation
    setTimeout(() => {
      const bill = lead.monthlyEnergyBill ? Number(lead.monthlyEnergyBill) : 0;
      const savings = bill > 0 ? Math.round(bill * 0.7) : null;
      const systemKw = bill > 0 ? Math.round(bill / 1000 * 10) / 10 : null;
      setAiSummary(
        `${lead.firstName} is a ${lead.homeownershipType || "residential"} customer from ${lead.state || "India"} with a monthly electricity bill of ₹${bill || "N/A"}. ` +
        (systemKw ? `Recommended system size: ~${systemKw} kW. ` : "") +
        (savings ? `Estimated monthly savings: ₹${savings}. ` : "") +
        `Current status: ${lead.status}. Lead score: ${lead.leadScore}/100. ` +
        (lead.referrerCode ? `Referred via ${lead.referrerCode}.` : "Direct lead.")
      );
      setSummaryLoading(false);
    }, 800);
  };

  const activityList = (activity.data as any[]) || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {lead.firstName?.[0]}{lead.lastName?.[0]}
            </div>
            <div>
              <h2 className="font-semibold text-base">{lead.firstName} {lead.lastName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status] || "bg-muted text-muted-foreground"}`}>
                  {lead.status}
                </span>
                {lead.leadScore > 0 && (
                  <span className="text-xs text-muted-foreground">Score: {lead.leadScore}/100</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contact Info */}
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <a href={`tel:${lead.phone}`} className="hover:text-primary transition-colors font-mono">{lead.phone}</a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${lead.email}`} className="hover:text-primary transition-colors truncate">{lead.email}</a>
                </div>
              )}
              {(lead.city || lead.state) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{[lead.city, lead.state].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {lead.homeownershipType && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{lead.homeownershipType === "commercial" ? "🏢 Commercial" : "🏠 Residential"}</span>
                </div>
              )}
              {lead.referrerCode && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-muted-foreground">Referred by <span className="font-mono text-amber-500">{lead.referrerCode}</span></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solar Data */}
          {(lead.monthlyEnergyBill || lead.estimatedSavings) && (
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Solar Data</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {lead.monthlyEnergyBill && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Monthly Bill</span>
                    <span className="font-medium">₹{Number(lead.monthlyEnergyBill).toLocaleString("en-IN")}</span>
                  </div>
                )}
                {lead.estimatedSavings && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5" /> Est. Savings</span>
                    <span className="font-medium text-green-500">₹{Number(lead.estimatedSavings).toLocaleString("en-IN")}/mo</span>
                  </div>
                )}
                {lead.leadScore > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Lead Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${lead.leadScore}%` }} />
                      </div>
                      <span className="font-medium">{lead.leadScore}/100</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Summary
                </CardTitle>
                {!aiSummary && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={generateSummary} disabled={summaryLoading}>
                    {summaryLoading ? "Generating..." : "Generate"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {summaryLoading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
                </div>
              ) : aiSummary ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{aiSummary}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Click Generate to create an AI summary of this lead.</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {lead.notes && (
            <Card className="border-border/50">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Notes</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card className="border-border/50">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Add note */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="text-sm h-8"
                  onKeyDown={e => {
                    if (e.key === "Enter" && noteText.trim()) {
                      addNote.mutate({ id: lead.id, notes: noteText.trim() });
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={!noteText.trim() || addNote.isPending}
                  onClick={() => addNote.mutate({ id: lead.id, notes: noteText.trim() })}
                >
                  Add
                </Button>
              </div>

              {activity.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityList.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityList.map((event: any, idx: number) => {
                    const Icon = ACTIVITY_ICONS[event.activityType] || ACTIVITY_ICONS.default;
                    return (
                      <div key={event.id} className="flex gap-3 relative">
                        {idx < activityList.length - 1 && (
                          <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
                        )}
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 z-10">
                          <Icon className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 pb-3">
                          <p className="text-xs font-medium leading-tight">{event.description || event.activityType}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [, setLocation] = useLocation();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const leads = trpc.leads.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
  });

  const updateLead = trpc.leads.update.useMutation({
    onSuccess: () => {
      leads.refetch();
      toast.success("Lead updated");
    },
  });

  const deleteLead = trpc.leads.delete.useMutation({
    onSuccess: () => {
      leads.refetch();
      setConfirmDeleteId(null);
      if (selectedLead?.id === confirmDeleteId) setSelectedLead(null);
      toast.success("Lead deleted");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const deleteBulk = trpc.leads.deleteBulk.useMutation({
    onSuccess: (data) => {
      leads.refetch();
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      toast.success(`${data.deleted} leads deleted`);
    },
    onError: () => toast.error("Failed to delete leads"),
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === allLeads.length) setSelectedIds([]);
    else setSelectedIds(allLeads.map((l: any) => l.id));
  };

  const assignLead = trpc.partner.assignLeadToPartner.useMutation({
    onSuccess: () => {
      leads.refetch();
      toast.success("Lead assigned to partner");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to assign lead");
    },
  });

  const partnersQuery = trpc.partner.getPartners.useQuery();
  const partners = (partnersQuery.data as any[]) || [];

  const allLeadsRaw = (leads.data as any[]) || [];
  const allLeads = propertyFilter === "all" ? allLeadsRaw : allLeadsRaw.filter((l: any) => (l.homeownershipType || "").toLowerCase() === propertyFilter);

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const raw = (leads.data as any[]) || [];
    return STATUS_OPTIONS.reduce((acc, opt) => {
      acc[opt.value] = opt.value === "all" ? raw.length : raw.filter((l: any) => l.status === opt.value).length;
      return acc;
    }, {} as Record<string, number>);
  }, [leads.data]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {allLeads.length} leads captured by AI bot
          </p>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg">
          <span className="text-sm font-medium text-destructive">{selectedIds.length} selected</span>
          <Button size="sm" variant="destructive" onClick={() => setConfirmBulkDelete(true)}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Confirm single delete dialog */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Lead?</h3>
            <p className="text-muted-foreground text-sm mb-4">This action cannot be undone. The lead and all its activity will be permanently removed.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteLead.mutate({ id: confirmDeleteId! })} disabled={deleteLead.isPending}>
                {deleteLead.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm bulk delete dialog */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete {selectedIds.length} Leads?</h3>
            <p className="text-muted-foreground text-sm mb-4">This action cannot be undone. All selected leads and their activity will be permanently removed.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmBulkDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteBulk.mutate({ ids: selectedIds })} disabled={deleteBulk.isPending}>
                {deleteBulk.isPending ? "Deleting..." : `Delete ${selectedIds.length} Leads`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Chips + Search */}
      <div className="space-y-3">
        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label} ({statusCounts[opt.value] || 0})
            </button>
          ))}
        </div>

        {/* Search + property filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[160px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROPERTY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                    {selectedIds.length === allLeads.length && allLeads.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Email</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Score</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">State</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">Referrer</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Assigned To</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-4 py-4 w-10"><div className="w-4 h-4 bg-muted rounded animate-pulse" /></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-3 bg-muted rounded animate-pulse w-24" />
                          <div className="h-2.5 bg-muted rounded animate-pulse w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-3 bg-muted rounded animate-pulse w-28" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3 bg-muted rounded animate-pulse w-36" /></td>
                    <td className="px-4 py-4"><div className="h-5 bg-muted rounded animate-pulse w-16" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><div className="h-3 bg-muted rounded animate-pulse w-12" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3 bg-muted rounded animate-pulse w-16" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3 bg-muted rounded animate-pulse w-16" /></td>
                    <td className="px-4 py-4 hidden xl:table-cell"><div className="h-3 bg-muted rounded animate-pulse w-20" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-7 bg-muted rounded animate-pulse w-28" /></td>
                    <td className="px-4 py-4"><div className="h-7 w-7 bg-muted rounded animate-pulse ml-auto" /></td>
                  </tr>
                ))
              ) : allLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-lg font-medium">No leads found</p>
                    <p className="text-sm mt-1 max-w-xs mx-auto">
                      {search || statusFilter !== "all" ? "Try adjusting your filters." : "Leads are automatically captured when customers chat with your AI bot."}
                    </p>
                  </td>
                </tr>
              ) : (
                allLeads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-border/50 hover:bg-card/30 cursor-pointer transition-colors ${selectedIds.includes(lead.id) ? 'bg-primary/5' : ''} ${selectedLead?.id === lead.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(lead.id); }}>
                      {selectedIds.includes(lead.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                          {lead.city && <p className="text-xs text-muted-foreground">{lead.city}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors">
                          <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-mono">{lead.phone}</span>
                        </a>
                      ) : <span className="text-xs text-muted-foreground">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors">
                          <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[160px]">{lead.email}</span>
                        </a>
                      ) : <span className="text-xs text-muted-foreground">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[lead.status] || "bg-muted text-muted-foreground"}`}>
                          {lead.status}
                        </span>
                        {lead.homeownershipType && (
                          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium w-fit ${
                            lead.homeownershipType === 'commercial'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-green-500/10 text-green-600 dark:text-green-400'
                          }`}>
                            {lead.homeownershipType === 'commercial' ? '🏢 Commercial' : '🏠 Residential'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-semibold priority-${lead.priority}`}>
                        {lead.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full solar-gradient" style={{ width: `${lead.leadScore || 0}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{lead.leadScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">{lead.state || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {lead.referrerCode ? (
                        <span className="inline-flex items-center text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-mono">
                          {lead.referrerCode}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">Direct</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Select
                        value={lead.assignedPartnerId ? String(lead.assignedPartnerId) : "unassigned"}
                        onValueChange={(val) => {
                          assignLead.mutate({ leadId: lead.id, partnerId: val !== "unassigned" ? parseInt(val) : null });
                        }}
                      >
                        <SelectTrigger className="w-[140px] text-xs" onClick={(e: any) => e.stopPropagation()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {partners.map((p: any) => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e: any) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e: any) => { e.stopPropagation(); setSelectedLead(lead); }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e: any) => {
                            e.stopPropagation();
                            updateLead.mutate({ id: lead.id, status: "contacted" });
                          }}>
                            <Phone className="w-4 h-4 mr-2" /> Mark Contacted
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e: any) => {
                            e.stopPropagation();
                            updateLead.mutate({ id: lead.id, status: "qualified" });
                          }}>
                            <Eye className="w-4 h-4 mr-2" /> Mark Qualified
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e: any) => {
                            e.stopPropagation();
                            updateLead.mutate({ id: lead.id, status: "converted" });
                          }}>
                            <ArrowUpDown className="w-4 h-4 mr-2" /> Mark Converted
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e: any) => { e.stopPropagation(); setConfirmDeleteId(lead.id); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Lead
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Sheet */}
      {selectedLead && (
        <LeadDetailSheet lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
