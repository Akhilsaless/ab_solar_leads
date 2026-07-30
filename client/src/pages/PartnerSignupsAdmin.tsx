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
import { Search, Mail, Phone, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function PartnerSignupsAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "contacted" | "interested" | "converted">("all");

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Partner Signups</h1>
        <p className="text-muted-foreground mt-2">
          Manage solar companies that signed up to receive leads
        </p>
      </div>

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
