import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, MessageSquare, TrendingUp } from "lucide-react";

export function AutomatedOutreach() {
  const [activeTab, setActiveTab] = useState("overview");
  const [configId, setConfigId] = useState<number | null>(null);

  // Queries
  const configQuery = trpc.automatedOutreach.config.get.useQuery();
  const todayQuery = trpc.automatedOutreach.records.getToday.useQuery();
  const repliesQuery = trpc.automatedOutreach.records.getReplies.useQuery();
  const dailyAnalyticsQuery = trpc.automatedOutreach.analytics.getDaily.useQuery();
  const weeklyAnalyticsQuery = trpc.automatedOutreach.analytics.getWeekly.useQuery();

  // Mutations
  const createConfigMutation = trpc.automatedOutreach.config.create.useMutation();
  const updateConfigMutation = trpc.automatedOutreach.config.update.useMutation();
  const initializeScoringMutation = trpc.automatedOutreach.scoring.initializeScoring.useMutation();
  const updateStatusMutation = trpc.automatedOutreach.records.updateStatus.useMutation();

  // Form state
  const [formData, setFormData] = useState({
    state: "Telangana",
    businessTypes: ["textile_mills", "cold_storage", "hospitals", "factories"],
    minRating: "3.5",
    contactsPerDay: "30",
    scheduleTime: "10:00",
    messageType: "industry_specific" as const,
    adminPhoneNumber: "",
    outreachMode: "blind" as "blind" | "owner_only",
  });

  useEffect(() => {
    if (configQuery.data && configQuery.data.length > 0) {
      const config = configQuery.data[0];
      setConfigId(config.id);
      setFormData({
        state: config.state,
        businessTypes: config.businessTypes || [],
        minRating: config.minRating?.toString() || "3.5",
        contactsPerDay: config.contactsPerDay?.toString() || "30",
        scheduleTime: config.scheduleTime || "10:00",
        messageType: config.messageType || "industry_specific",
        adminPhoneNumber: config.adminPhoneNumber || "",
        outreachMode: (config.outreachMode as "blind" | "owner_only") || "blind",
      });
    }
  }, [configQuery.data]);

  const handleCreateConfig = async () => {
    try {
      await createConfigMutation.mutateAsync({
        state: formData.state,
        businessTypes: formData.businessTypes,
        minRating: parseFloat(formData.minRating),
        contactsPerDay: parseInt(formData.contactsPerDay),
        scheduleTime: formData.scheduleTime,
        messageType: formData.messageType,
        adminPhoneNumber: formData.adminPhoneNumber || undefined,
      });
      await configQuery.refetch();
      await initializeScoringMutation.mutateAsync();
    } catch (error) {
      console.error("Error creating config:", error);
    }
  };

  const handleUpdateConfig = async () => {
    if (!configId) return;
    try {
      await updateConfigMutation.mutateAsync({
        id: configId,
        contactsPerDay: parseInt(formData.contactsPerDay),
        scheduleTime: formData.scheduleTime,
        adminPhoneNumber: formData.adminPhoneNumber || undefined,
        outreachMode: formData.outreachMode,
      });
      await configQuery.refetch();
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  const handleReplyStatusChange = async (recordId: number, status: "interested" | "not_interested") => {
    try {
      await updateStatusMutation.mutateAsync({
        recordId,
        status: "replied",
        leadScore: status === "interested" ? 80 : 20,
      });
      await repliesQuery.refetch();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const analytics = dailyAnalyticsQuery.data;
  const todayRecords = todayQuery.data || [];
  const replies = repliesQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automated Outreach</h1>
          <p className="text-gray-500 mt-1">Daily WhatsApp & Email to Telangana businesses</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="today">Today's Outreach</TabsTrigger>
          <TabsTrigger value="replies">Replies</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Today's Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalSent || 0}</div>
                <p className="text-xs text-gray-500 mt-1">Scheduled for 10:00 AM</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalDelivered || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics ? `${((analytics.totalDelivered / analytics.totalSent) * 100).toFixed(0)}% delivery rate` : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Replies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics?.totalReplied || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics ? `${analytics.responseRate?.toFixed(1)}% response rate` : "N/A"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Interested</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{analytics?.totalInterested || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics ? `${analytics.conversionRate?.toFixed(1)}% conversion` : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Status</CardTitle>
              <CardDescription>Daily automated outreach to verified Telangana businesses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Campaign Active</p>
                    <p className="text-sm text-gray-600">Sending 30 messages daily at 10:00 AM</p>
                  </div>
                </div>
                <Badge className="bg-green-600">ACTIVE</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Business Types</p>
                  <p className="font-medium">Textile, Cold Storage, Hospitals, Factories</p>
                </div>
                <div>
                  <p className="text-gray-600">Minimum Rating</p>
                  <p className="font-medium">3.5+ stars</p>
                </div>
                <div>
                  <p className="text-gray-600">Message Type</p>
                  <p className="font-medium">Industry-Specific</p>
                </div>
                <div>
                  <p className="text-gray-600">Location</p>
                  <p className="font-medium">Telangana Only</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Configuration</CardTitle>
              <CardDescription>Customize your automated outreach settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>State</Label>
                  <Input value={formData.state} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Minimum Rating</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.minRating}
                    onChange={(e) => setFormData({ ...formData, minRating: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contacts Per Day</Label>
                  <Input
                    type="number"
                    value={formData.contactsPerDay}
                    onChange={(e) => setFormData({ ...formData, contactsPerDay: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Schedule Time (HH:MM)</Label>
                  <Input
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Your WhatsApp Number (for alerts)</Label>
                <Input
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.adminPhoneNumber}
                  onChange={(e) => setFormData({ ...formData, adminPhoneNumber: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Outreach Mode</Label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, outreachMode: "blind" })}
                    className={`flex-1 rounded-lg border-2 p-3 text-left transition-all ${
                      formData.outreachMode === "blind"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-sm">🚀 Blind Send</div>
                    <div className="text-xs mt-0.5">Messages are sent automatically to businesses without owner approval</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, outreachMode: "owner_only" })}
                    className={`flex-1 rounded-lg border-2 p-3 text-left transition-all ${
                      formData.outreachMode === "owner_only"
                        ? "border-amber-500 bg-amber-500/10 text-amber-600"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-sm">🔔 Owner Approval</div>
                    <div className="text-xs mt-0.5">You get notified first; messages only send after your approval</div>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={configId ? handleUpdateConfig : handleCreateConfig}
                  disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
                >
                  {configId ? "Update Settings" : "Create Campaign"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TODAY'S OUTREACH TAB */}
        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Outreach ({todayRecords.length})</CardTitle>
              <CardDescription>Messages scheduled for today</CardDescription>
            </CardHeader>
            <CardContent>
              {todayRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No outreach scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {todayRecords.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{record.businessName}</p>
                        <p className="text-sm text-gray-600">{record.businessType}</p>
                      </div>
                      <Badge variant={record.status === "sent" ? "default" : "secondary"}>
                        {record.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPLIES TAB */}
        <TabsContent value="replies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Replies ({replies.length})</CardTitle>
              <CardDescription>Businesses that responded to your outreach</CardDescription>
            </CardHeader>
            <CardContent>
              {replies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No replies yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {replies.map((reply: any) => (
                    <div key={reply.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{reply.businessName}</p>
                          <p className="text-sm text-gray-600">{reply.ownerName}</p>
                        </div>
                        <Badge className="bg-blue-600">REPLIED</Badge>
                      </div>
                      <p className="text-sm bg-gray-50 p-2 rounded">{reply.replyText}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleReplyStatusChange(reply.id, "interested")}
                        >
                          Interested
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReplyStatusChange(reply.id, "not_interested")}
                        >
                          Not Interested
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
