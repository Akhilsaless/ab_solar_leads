import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users, Search, Mail, Phone, MessageSquare, MoreHorizontal,
  Eye, ArrowUpDown
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
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

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [, setLocation] = useLocation();

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

  const allLeadsRaw = leads.data || [];
  const allLeads = propertyFilter === "all" ? allLeadsRaw : allLeadsRaw.filter((l: any) => (l.homeownershipType || "").toLowerCase() === propertyFilter);

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card/50">
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
                    <td colSpan={9} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : allLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No leads found</p>
                    <p className="text-sm mt-1">Leads are automatically captured when customers chat with your AI bot.</p>
                  </td>
                </tr>
              ) : (
                allLeads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border/50 hover:bg-card/30 cursor-pointer transition-colors"
                    onClick={() => toast.info("Lead detail view coming soon")}
                  >
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
                        <span className={`status-badge status-${lead.status}`}>{lead.status}</span>
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
    </div>
  );
}
