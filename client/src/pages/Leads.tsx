import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Search, Plus, Mail, Phone, MessageSquare, MoreHorizontal,
  ChevronRight, Filter, Trash2, Eye, ArrowUpDown
} from "lucide-react";
import { useState, useMemo } from "react";
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

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priority" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [, setLocation] = useLocation();

  const leads = trpc.leads.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    search: search || undefined,
  });

  const deleteLead = trpc.leads.delete.useMutation({
    onSuccess: () => {
      leads.refetch();
      toast.success("Lead deleted");
    },
  });

  const updateLead = trpc.leads.update.useMutation({
    onSuccess: () => {
      leads.refetch();
      toast.success("Lead updated");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Leads
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {leads.data?.length || 0} total leads
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/leads/import")}>
            Import CSV
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="solar-gradient text-black">
                <Plus className="w-4 h-4 mr-1" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <AddLeadForm onSuccess={() => { setShowAddDialog(false); leads.refetch(); }} />
            </DialogContent>
          </Dialog>
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
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px] bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map(opt => (
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
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Contact</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Priority</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Score</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Source</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : leads.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No leads found</p>
                    <p className="text-sm mt-1">Import leads or add them manually to get started.</p>
                  </td>
                </tr>
              ) : (
                leads.data?.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border/50 table-row cursor-pointer"
                    onClick={() => setLocation(`/leads/${lead.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {lead.firstName?.[0]}{lead.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lead.firstName} {lead.lastName}</p>
                          {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {lead.email && (
                          <span className="channel-badge channel-email">
                            <Mail className="w-3 h-3" />
                          </span>
                        )}
                        {lead.phone && (
                          <span className="channel-badge channel-phone">
                            <Phone className="w-3 h-3" />
                          </span>
                        )}
                        {lead.whatsapp && (
                          <span className="channel-badge channel-whatsapp">
                            <MessageSquare className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-badge status-${lead.status}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs font-semibold priority-${lead.priority}`}>
                        {lead.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full solar-gradient"
                            style={{ width: `${lead.leadScore || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{lead.leadScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">{lead.source || "manual"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/leads/${lead.id}`); }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLead.mutate({ id: lead.id, status: "contacted" });
                            }}
                          >
                            <Phone className="w-4 h-4 mr-2" /> Mark Contacted
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this lead?")) deleteLead.mutate({ id: lead.id });
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
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

function AddLeadForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", whatsapp: "",
    company: "", propertyAddress: "", city: "", state: "", zipCode: "",
    monthlyEnergyBill: "", roofCondition: "", sunExposure: "",
    installationTimeline: "", notes: "",
  });

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      toast.success("Lead created successfully");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) {
      toast.error("First and last name are required");
      return;
    }
    createLead.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">First Name *</Label>
          <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="bg-card mt-1" />
        </div>
        <div>
          <Label className="text-xs">Last Name *</Label>
          <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="bg-card mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-card mt-1" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-card mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">WhatsApp</Label>
          <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} className="bg-card mt-1" />
        </div>
        <div>
          <Label className="text-xs">Company</Label>
          <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="bg-card mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Property Address</Label>
        <Input value={form.propertyAddress} onChange={e => setForm(f => ({ ...f, propertyAddress: e.target.value }))} className="bg-card mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">City</Label>
          <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="bg-card mt-1" />
        </div>
        <div>
          <Label className="text-xs">State</Label>
          <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="bg-card mt-1" />
        </div>
        <div>
          <Label className="text-xs">Zip Code</Label>
          <Input value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} className="bg-card mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Monthly Energy Bill (INR)</Label>
          <Input type="number" value={form.monthlyEnergyBill} onChange={e => setForm(f => ({ ...f, monthlyEnergyBill: e.target.value }))} className="bg-card mt-1" />
        </div>
        <div>
          <Label className="text-xs">Installation Timeline</Label>
          <Select value={form.installationTimeline || "unset"} onValueChange={v => setForm(f => ({ ...f, installationTimeline: v === "unset" ? "" : v }))}>
            <SelectTrigger className="bg-card mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Select...</SelectItem>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="3-6months">3-6 Months</SelectItem>
              <SelectItem value="6-12months">6-12 Months</SelectItem>
              <SelectItem value="researching">Just Researching</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Notes</Label>
        <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-card mt-1" placeholder="Additional notes..." />
      </div>
      <Button type="submit" className="w-full solar-gradient text-black" disabled={createLead.isPending}>
        {createLead.isPending ? "Creating..." : "Create Lead"}
      </Button>
    </form>
  );
}
