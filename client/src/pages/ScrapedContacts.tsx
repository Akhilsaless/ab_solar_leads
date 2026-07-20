import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, Phone, Mail, MapPin, FileDown } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const statusColor: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-yellow-500/20 text-yellow-400",
  qualified: "bg-purple-500/20 text-purple-400",
  converted: "bg-green-500/20 text-green-400",
  lost: "bg-red-500/20 text-red-400",
};

export default function ScrapedContacts() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data: contacts = [], isLoading, refetch } = trpc.leads.scrapedContacts.useQuery({
    status: status === "all" ? undefined : status,
    search: search || undefined,
  });

  const updateMutation = trpc.leads.update.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: () => toast.error("Failed to update"),
  });

  const exportCSV = () => {
    if (!contacts.length) { toast.error("No contacts to export"); return; }
    const headers = ["Name", "Phone", "Email", "City", "State", "Status", "Notes", "Date"];
    const rows = (contacts as any[]).map((c: any) => [
      `${c.firstName || ""} ${c.lastName || ""}`.trim(),
      c.phone || "",
      c.email || "",
      c.city || "",
      c.state || "",
      c.status || "",
      (c.notes || "").replace(/,/g, ";"),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scraped-contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Scraped Contacts</h1>
            <p className="text-gray-400">Businesses imported from the Business Scraper</p>
          </div>
          <Button
            onClick={exportCSV}
            variant="outline"
            className="border-slate-600 text-gray-300 hover:bg-slate-700"
          >
            <FileDown className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-white">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: (contacts as any[]).length, color: "text-white" },
            { label: "New", value: (contacts as any[]).filter((c: any) => c.status === "new").length, color: "text-blue-400" },
            { label: "Contacted", value: (contacts as any[]).filter((c: any) => c.status === "contacted").length, color: "text-yellow-400" },
            { label: "Converted", value: (contacts as any[]).filter((c: any) => c.status === "converted").length, color: "text-green-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading contacts...</div>
        ) : (contacts as any[]).length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-16 text-center">
            <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No scraped contacts yet</p>
            <p className="text-gray-500 text-sm mt-2">Go to Business Scraper, search for businesses, and click "Import" to add them here</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50 border-b border-slate-600">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Business / Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Phone</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Location</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {(contacts as any[]).map((contact: any) => (
                    <tr key={contact.id} className="hover:bg-slate-700/20 transition">
                      <td className="px-5 py-4">
                        <div className="text-sm text-white font-medium">
                          {contact.firstName} {contact.lastName}
                        </div>
                        {contact.notes && (
                          <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{contact.notes}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-sm text-gray-300 hover:text-orange-400">
                            <Phone className="w-3 h-3" /> {contact.phone}
                          </a>
                        ) : <span className="text-gray-600 text-sm italic">No phone</span>}
                      </td>
                      <td className="px-5 py-4">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-sm text-gray-300 hover:text-orange-400">
                            <Mail className="w-3 h-3" /> {contact.email}
                          </a>
                        ) : <span className="text-gray-600 text-sm italic">No email</span>}
                      </td>
                      <td className="px-5 py-4">
                        {(contact.city || contact.state) ? (
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <MapPin className="w-3 h-3" /> {[contact.city, contact.state].filter(Boolean).join(", ")}
                          </span>
                        ) : <span className="text-gray-600 text-sm italic">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <Badge className={`text-xs ${statusColor[contact.status] || "bg-gray-500/20 text-gray-400"}`}>
                          {contact.status || "new"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <Select
                          value={contact.status || "new"}
                          onValueChange={(val) => updateMutation.mutate({ id: contact.id, status: val })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="new" className="text-white text-xs">New</SelectItem>
                            <SelectItem value="contacted" className="text-white text-xs">Contacted</SelectItem>
                            <SelectItem value="qualified" className="text-white text-xs">Qualified</SelectItem>
                            <SelectItem value="converted" className="text-white text-xs">Converted</SelectItem>
                            <SelectItem value="lost" className="text-white text-xs">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
