import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, MapPin, Calendar, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function PartnerSignupsAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "contacted" | "interested" | "converted">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: signups = [], isLoading, refetch } = trpc.partnerManagement.getSignups.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: searchTerm || undefined,
  });

  const updateStatusMutation = trpc.partnerManagement.updateSignupStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated!");
      refetch();
    },
  });

  const deleteSignupMutation = trpc.partnerManagement.deleteSignup.useMutation({
    onSuccess: () => {
      toast.success("Partner signup deleted");
      setConfirmDeleteId(null);
      refetch();
    },
    onError: () => toast.error("Failed to delete signup"),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      interested: "bg-purple-100 text-purple-800",
      converted: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleStatusChange = (id: string, newStatus: "new" | "contacted" | "interested" | "converted") => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Confirm delete dialog */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Partner Signup?</h3>
            <p className="text-muted-foreground text-sm mb-4">This will permanently remove this partner signup record. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteSignupMutation.mutate({ id: confirmDeleteId! })} disabled={deleteSignupMutation.isPending}>
                {deleteSignupMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Partner Signups</h1>
        <p className="text-muted-foreground mt-2">
          Manage solar companies that signed up to receive leads
        </p>
      </div>

      {/* Partner Signup Link */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Partner Signup Page Link</p>
          <div className="flex gap-2 items-center">
            <Input
              value={`${window.location.origin}/partner-signup`}
              readOnly
              className="bg-background font-mono text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => copyLink(`${window.location.origin}/partner-signup`)}>
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`${window.location.origin}/partner-signup`, "_blank")}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Share this link with solar companies to let them sign up as lead-receiving partners. Each partner gets a unique link once they sign up.</p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{signups.filter((s: any) => s.status === "new").length}</div>
              <p className="text-sm text-muted-foreground mt-1">New Signups</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{signups.filter((s: any) => s.status === "contacted").length}</div>
              <p className="text-sm text-muted-foreground mt-1">Contacted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{signups.filter((s: any) => s.status === "interested").length}</div>
              <p className="text-sm text-muted-foreground mt-1">Interested</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{signups.filter((s: any) => s.status === "converted").length}</div>
              <p className="text-sm text-muted-foreground mt-1">Converted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Partner Signups</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : signups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No partner signups yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead>Partner Link</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signups.map((signup: any) => (
                    <TableRow key={signup.id}>
                      <TableCell className="font-medium">{signup.companyName}</TableCell>
                      <TableCell>{signup.contactName}</TableCell>
                      <TableCell>
                        <a href={`mailto:${signup.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {signup.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${signup.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {signup.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          {signup.city}, {signup.state}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(signup.status)}>
                          {signup.status.charAt(0).toUpperCase() + signup.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(signup.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {signup.partnerSlug ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">/partner/{signup.partnerSlug}</span>
                            <button onClick={() => copyLink(`${window.location.origin}/partner/${signup.partnerSlug}`)} className="p-1 rounded hover:bg-muted transition-colors" title="Copy partner link">
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No link yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={signup.status}
                            onValueChange={(newStatus: any) => handleStatusChange(signup.id, newStatus)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="interested">Interested</SelectItem>
                              <SelectItem value="converted">Converted</SelectItem>
                            </SelectContent>
                          </Select>
                          <button
                            onClick={() => setConfirmDeleteId(signup.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                            title="Delete signup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
