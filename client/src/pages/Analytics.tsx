import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  BarChart3, TrendingUp, Users, Megaphone, DollarSign,
  ArrowUpRight, ArrowDownRight, Target, Zap, Mail, Phone, MessageSquare
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#e8a735", "#4ade80", "#60a5fa", "#f472b6", "#a78bfa", "#f97316"];

const tooltipStyle = {
  backgroundColor: "oklch(0.155 0.005 260)",
  border: "1px solid oklch(0.24 0.005 260)",
  borderRadius: "8px",
  color: "#fff",
};

export default function Analytics() {
  const stats = trpc.leads.stats.useQuery();

  const total = stats.data?.total || 0;
  const converted = stats.data?.byStatus?.converted || 0;
  const qualified = stats.data?.byStatus?.qualified || 0;
  const contacted = stats.data?.byStatus?.contacted || 0;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";
  const qualificationRate = total > 0 ? ((qualified / total) * 100).toFixed(1) : "0";

  const statusData = stats.data?.byStatus
    ? Object.entries(stats.data.byStatus).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : [];

  const sourceData = stats.data?.bySource
    ? Object.entries(stats.data.bySource).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : [];

  const priorityData = stats.data?.byPriority
    ? Object.entries(stats.data.byPriority).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : [];

  // Simulated monthly trend
  const monthlyTrend = [
    { month: "Oct", leads: 8, converted: 2 },
    { month: "Nov", leads: 15, converted: 4 },
    { month: "Dec", leads: 22, converted: 6 },
    { month: "Jan", leads: 30, converted: 10 },
    { month: "Feb", leads: 38, converted: 14 },
    { month: "Mar", leads: total || 45, converted: converted || 18 },
  ];

  // Channel performance
  const channelData = [
    { channel: "Email", sent: 120, opened: 85, responded: 32 },
    { channel: "SMS", sent: 80, opened: 72, responded: 28 },
    { channel: "WhatsApp", sent: 65, opened: 60, responded: 35 },
    { channel: "Phone", sent: 40, opened: 40, responded: 22 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Track your lead generation and outreach performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Leads" value={total.toString()} icon={Users} trend="+12%" up />
        <KPICard title="Conversion Rate" value={`${conversionRate}%`} icon={Target} trend="+3.2%" up />
        <KPICard title="Qualification Rate" value={`${qualificationRate}%`} icon={TrendingUp} trend="+5.1%" up />
        <KPICard title="Est. Revenue" value={`₹${(converted * 150000).toLocaleString()}`} icon={DollarSign} trend="+18%" up />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Growth */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4">Lead Growth & Conversions</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorLeads2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8a735" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e8a735" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="leads" stroke="#e8a735" fill="url(#colorLeads2)" strokeWidth={2} />
                <Area type="monotone" dataKey="converted" stroke="#4ade80" fill="url(#colorConverted)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Performance */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4">Channel Performance</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData}>
                <XAxis dataKey="channel" stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#555" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="sent" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="#e8a735" radius={[4, 4, 0, 0]} />
                <Bar dataKey="responded" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4">Lead Status</h3>
          {statusData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {statusData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>

        {/* Source Distribution */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4">Lead Sources</h3>
          {sourceData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {sourceData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4">Priority Breakdown</h3>
          {priorityData.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                      {priorityData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {priorityData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[(i + 4) % COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Funnel */}
      <div className="stat-card">
        <h3 className="font-semibold mb-6">Conversion Funnel</h3>
        <div className="space-y-3 max-w-2xl mx-auto">
          {[
            { label: "Total Leads", value: total, color: "#60a5fa" },
            { label: "Contacted", value: contacted + qualified + converted, color: "#e8a735" },
            { label: "Qualified", value: qualified + converted, color: "#a78bfa" },
            { label: "Converted", value: converted, color: "#4ade80" },
          ].map((step, i) => {
            const width = total > 0 ? Math.max((step.value / total) * 100, 8) : (100 - i * 20);
            return (
              <div key={step.label} className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-20 text-right">{step.label}</span>
                <div className="flex-1 h-10 bg-muted/30 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700"
                    style={{ width: `${width}%`, backgroundColor: step.color + "30", borderLeft: `3px solid ${step.color}` }}
                  >
                    <span className="text-sm font-bold" style={{ color: step.color }}>{step.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, trend, up }: {
  title: string; value: string; icon: any; trend: string; up: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className={`text-xs font-medium flex items-center gap-0.5 mb-1 ${up ? "text-green-400" : "text-red-400"}`}>
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </span>
      </div>
    </div>
  );
}
