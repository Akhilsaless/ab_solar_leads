import { useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { MapPin, Mail, Phone, Calendar, DollarSign, Zap, MessageSquare, Send, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function LeadDetail() {
  const [, params] = useRoute("/lead/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const leadId = params?.id ? parseInt(params.id) : null;

  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const leadQuery = trpc.leads.getById.useQuery({ id: leadId! }, { enabled: !!leadId });
  const timelineQuery = trpc.timeline.list.useQuery({ leadId: leadId! }, { enabled: !!leadId });
  const notesQuery = trpc.notes.list.useQuery({ leadId: leadId! }, { enabled: !!leadId });
  const followUpsQuery = trpc.followUps.list.useQuery({ leadId: leadId! }, { enabled: !!leadId });

  const updateLeadMutation = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead updated successfully");
      leadQuery.refetch();
      timelineQuery.refetch();
      setNewStatus("");
    },
  });

  const addNoteMutation = trpc.notes.add.useMutation({
    onSuccess: () => {
      toast.success("Note added successfully");
      setNewNote("");
      notesQuery.refetch();
      timelineQuery.refetch();
    },
  });

  const aiScoreMutation = trpc.ai.scoreLead.useMutation({
    onSuccess: () => {
      toast.success("Lead scored successfully");
      leadQuery.refetch();
    },
  });

  const generateTemplateMutation = trpc.ai.generateResponseTemplate.useQuery(
    { leadId: leadId! },
    { enabled: false }
  );

  const lead = leadQuery.data;
  const timeline = timelineQuery.data || [];
  const notes = notesQuery.data || [];
  const followUps = followUpsQuery.data || [];

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading lead details...</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-yellow-100 text-yellow-700",
    qualified: "bg-purple-100 text-purple-700",
    converted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-orange-100 text-orange-700",
    high: "bg-red-100 text-red-700",
  };

  const handleStatusChange = (status: string) => {
    updateLeadMutation.mutate({
      id: leadId!,
      status: status as any,
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({
      leadId: leadId!,
      content: newNote,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{lead.firstName} {lead.lastName}</h1>
              <p className="text-muted-foreground">{lead.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[lead.status]}>
              {lead.status}
            </Badge>
            <Badge className={priorityColors[lead.priority]}>
              {lead.priority}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Information */}
            <Card className="card-elevated p-6">
              <h2 className="text-xl font-bold mb-4">Lead Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Phone</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                      {lead.email}
                    </a>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Location</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{lead.city}, {lead.state} {lead.zipCode}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Submitted</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Property Details */}
            <Card className="card-elevated p-6">
              <h2 className="text-xl font-bold mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Address</Label>
                  <p className="mt-2 font-medium">{lead.propertyAddress}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Roof Condition</Label>
                  <p className="mt-2 font-medium capitalize">{lead.roofCondition || "Not specified"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Roof Age</Label>
                  <p className="mt-2 font-medium">{lead.roofAge ? `${lead.roofAge} years` : "Not specified"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Sun Exposure</Label>
                  <p className="mt-2 font-medium capitalize">{lead.sunExposure || "Not specified"}</p>
                </div>
              </div>
            </Card>

            {/* Energy Information */}
            <Card className="card-elevated p-6">
              <h2 className="text-xl font-bold mb-4">Energy Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground">Monthly Energy Bill</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-2xl font-bold">{lead.monthlyEnergyBill || "Not specified"}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Estimated Annual Savings</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-2xl font-bold">${lead.estimatedSavings || 0}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Installation Timeline</Label>
                  <p className="mt-2 font-medium capitalize">{lead.installationTimeline || "Not specified"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Homeownership Type</Label>
                  <p className="mt-2 font-medium capitalize">{lead.homeownershipType || "Not specified"}</p>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="card-elevated p-6">
              <h2 className="text-xl font-bold mb-4">Activity Timeline</h2>
              <div className="space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No activity yet</p>
                ) : (
                  timeline.map((event: any, idx: number) => (
                    <div key={idx} className="flex gap-4 pb-4 border-b border-border last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{event.eventType.replace(/_/g, " ")}</p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Notes Section */}
            <Card className="card-elevated p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Notes ({notes.length})
              </h2>

              {/* Add Note */}
              <div className="mb-6 pb-6 border-b border-border">
                <Textarea
                  placeholder="Add a note about this lead..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="mb-3"
                  rows={3}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={addNoteMutation.isPending || !newNote.trim()}
                  className="btn-primary gap-2"
                >
                  <Send className="w-4 h-4" />
                  Add Note
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No notes yet</p>
                ) : (
                  notes.map((note: any, idx: number) => (
                    <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lead Score */}
            <Card className="card-elevated p-6">
              <h3 className="font-bold mb-4">Lead Score</h3>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-primary">{lead.leadScore}</div>
                <p className="text-sm text-muted-foreground mt-2">Out of 100</p>
              </div>
              <Button
                onClick={() => aiScoreMutation.mutate({ leadId: leadId! })}
                disabled={aiScoreMutation.isPending}
                className="w-full btn-secondary"
              >
                {aiScoreMutation.isPending ? "Scoring..." : "Re-score Lead"}
              </Button>
            </Card>

            {/* Status Management */}
            <Card className="card-elevated p-6">
              <h3 className="font-bold mb-4">Update Status</h3>
              <Select value={newStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="mb-3">
                  <SelectValue placeholder={lead.status} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              {updateLeadMutation.isPending && (
                <p className="text-sm text-muted-foreground">Updating...</p>
              )}
            </Card>

            {/* Follow-ups */}
            <Card className="card-elevated p-6">
              <h3 className="font-bold mb-4">Follow-ups ({followUps.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {followUps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No follow-ups scheduled</p>
                ) : (
                  followUps.map((followUp: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded text-sm">
                      <p className="font-medium capitalize">{followUp.emailType}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(followUp.scheduledAt).toLocaleString()}
                      </p>
                      <Badge className="mt-2 text-xs" variant="outline">
                        {followUp.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* AI Actions */}
            <Card className="card-elevated p-6">
              <h3 className="font-bold mb-4">AI Actions</h3>
              <Button
                onClick={() => generateTemplateMutation.refetch()}
                disabled={generateTemplateMutation.isLoading}
                className="w-full btn-secondary text-sm"
              >
                {generateTemplateMutation.isLoading ? "Generating..." : "Generate Response Template"}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
