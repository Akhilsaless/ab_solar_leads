import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, MessageSquare, Users, TrendingUp, IndianRupee,
  Sun, Target, Clock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const tooltipStyle = {
  backgroundColor: "oklch(0.155 0.005 260)",
  border: "1px solid oklch(0.24 0.005 260)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: 12,
};

export default function Analytics() {
  const { data: stats } = trpc.conversations.stats.useQuery();
  const { data: conversations } = trpc.conversations.list.useQuery();

  const allConvs = conversations || [];
  const totalConvs = stats?.total || 0;
  const leadsCaptured = stats?.leadsCaptured || 0;
  const estimatesGiven = stats?.estimatesGiven || 0;
  const converted = stats?.converted || 0;
  const conversionRate = totalConvs > 0 ? ((converted / totalConvs) * 100).toFixed(1) : "0";
  const captureRate = totalConvs > 0 ? ((leadsCaptured / totalConvs) * 100).toFixed(1) : "0";

  const statusData = [
    { name: "Active", value: stats?.active || 0, color: "#3B82F6" },
    { name: "Lead Captured", value: stats?.leadsCaptured || 0, color: "#22C55E" },
    { name: "Estimate Given", value: stats?.estimatesGiven || 0, color: "#F59E0B" },
    { name: "Converted", value: stats?.converted || 0, color: "#10B981" },
    { name: "Dropped", value: stats?.dropped || 0, color: "#EF4444" },
  ].filter(d => d.value > 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const dayConvs = allConvs.filter((c: any) => new Date(c.createdAt).toISOString().split("T")[0] === dateStr);
    return {
      date: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      conversations: dayConvs.length,
      leads: dayConvs.filter((c: any) => c.customerName).length,
    };
  });

  const stateMap: Record<string, number> = {};
  allConvs.forEach((c: any) => { if (c.customerState) stateMap[c.customerState] = (stateMap[c.customerState] || 0) + 1; });
  const stateData = Object.entries(stateMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const systemSizes = allConvs.filter((c: any) => c.recommendedKw).map((c: any) => Number(c.recommendedKw));
  const avgSystemSize = systemSizes.length > 0 ? (systemSizes.reduce((a: number, b: number) => a + b, 0) / systemSizes.length).toFixed(1) : "0";
  const totalEstimatedValue = allConvs.filter((c: any) => c.netCost).reduce((sum: number, c: any) => sum + Number(c.netCost), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Performance metrics for your AI sales bot</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={MessageSquare} label="Total Conversations" value={totalConvs} color="text-blue-400" bg="bg-blue-400/10" />
        <KPICard icon={Target} label="Capture Rate" value={`${captureRate}%`} color="text-green-400" bg="bg-green-400/10" />
        <KPICard icon={TrendingUp} label="Conversion Rate" value={`${conversionRate}%`} color="text-emerald-400" bg="bg-emerald-400/10" />
        <KPICard icon={Sun} label="Avg System Size" value={`${avgSystemSize} kW`} color="text-amber-400" bg="bg-amber-400/10" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Leads Captured" value={leadsCaptured} color="text-violet-400" bg="bg-violet-400/10" />
        <KPICard icon={IndianRupee} label="Estimates Given" value={estimatesGiven} color="text-orange-400" bg="bg-orange-400/10" />
        <KPICard icon={IndianRupee} label="Pipeline Value" value={`₹${(totalEstimatedValue / 100000).toFixed(1)}L`} color="text-primary" bg="bg-primary/10" />
        <KPICard icon={Clock} label="Avg Messages" value={totalConvs > 0 ? Math.round(allConvs.reduce((s: number, c: any) => s + (c.messageCount || 0), 0) / totalConvs) : 0} color="text-cyan-400" bg="bg-cyan-400/10" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Daily Activity (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="conversations" stroke="#F97316" fill="#F9731620" name="Conversations" />
                  <Area type="monotone" dataKey="leads" stroke="#22C55E" fill="#22C55E20" name="Leads" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Conversation Status</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {statusData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {statusData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Leads by State</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {stateData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No state data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="#F97316" radius={[4, 4, 0, 0]} name="Conversations" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: any; color: string; bg: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
