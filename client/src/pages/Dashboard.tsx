import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, Zap, DollarSign, Search, Filter } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const leadsQuery = trpc.leads.list.useQuery({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    search: searchTerm || undefined,
    limit: 100,
  });

  const statsQuery = trpc.leads.stats.useQuery();
  const analyticsQuery = trpc.analytics.dashboard.useQuery();

  const leads = leadsQuery.data || [];
  const stats = statsQuery.data;
  const analytics = analyticsQuery.data;

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

  const dashboardStats = [
    {
      title: "Total Leads",
      value: stats?.total || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Conversion Rate",
      value: `${analytics?.conversionRate || 0}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Savings",
      value: `$${(analytics?.totalSavings || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Avg Lead Score",
      value: analytics?.avgLeadScore || 0,
      icon: Zap,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Lead Management Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage and track your solar leads efficiently</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <Card key={idx} className="card-elevated p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card className="card-elevated p-6">
            <h3 className="text-lg font-bold mb-4">Leads by Status</h3>
            {analytics && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "New", value: analytics.byStatus.new },
                      { name: "Contacted", value: analytics.byStatus.contacted },
                      { name: "Qualified", value: analytics.byStatus.qualified },
                      { name: "Converted", value: analytics.byStatus.converted },
                      { name: "Rejected", value: analytics.byStatus.rejected },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#FF6B35" />
                    <Cell fill="#FFA500" />
                    <Cell fill="#9C27B0" />
                    <Cell fill="#4CAF50" />
                    <Cell fill="#F44336" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Priority Distribution */}
          <Card className="card-elevated p-6">
            <h3 className="text-lg font-bold mb-4">Leads by Priority</h3>
            {analytics && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: "High", value: analytics.byPriority.high },
                    { name: "Medium", value: analytics.byPriority.medium },
                    { name: "Low", value: analytics.byPriority.low },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FF6B35" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Leads Table */}
        <Card className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Recent Leads</h3>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Location</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold">Score</th>
                  <th className="text-left py-3 px-4 font-semibold">Savings</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {leadsQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading leads...
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead: any) => (
                    <tr key={lead.id} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-3 px-4 font-medium">{lead.firstName} {lead.lastName}</td>
                      <td className="py-3 px-4 text-sm">{lead.email}</td>
                      <td className="py-3 px-4 text-sm">{lead.city}, {lead.state}</td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[lead.status] || "bg-gray-100"}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={priorityColors[lead.priority] || "bg-gray-100"}>
                          {lead.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">{lead.leadScore}</td>
                      <td className="py-3 px-4">${lead.estimatedSavings || 0}</td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/lead/${lead.id}`)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
