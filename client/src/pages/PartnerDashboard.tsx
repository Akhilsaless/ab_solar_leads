import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sun, LogIn, LogOut, Phone, Mail, MapPin,
  Users, TrendingUp, Clock, CheckCircle, Loader2
} from "lucide-react";

const STORAGE_KEY = "partner_token";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    contacted: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    qualified: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    converted: "text-green-400 border-green-500/30 bg-green-500/10",
    lost: "text-red-400 border-red-500/30 bg-red-500/10",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status] || map.new}`}>
      {status}
    </Badge>
  );
}

export default function PartnerDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem(STORAGE_KEY));

  const loginMutation = trpc.partner.partnerLogin.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
      setIsLoggedIn(true);
      toast.success(`Welcome back, ${data.companyName}!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const dashboardQuery = trpc.partner.getMyLeads.useQuery(
    { token },
    { enabled: isLoggedIn && !!token }
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter email and password"); return; }
    loginMutation.mutate({ email, password });
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
  };

  // If token is invalid, reset
  useEffect(() => {
    if (dashboardQuery.data?.partner === null && isLoggedIn) {
      handleLogout();
      toast.error("Session expired. Please log in again.");
    }
  }, [dashboardQuery.data]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
              <Sun className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Partner Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Sales Squad — Solar Lead Management</p>
          </div>

          <Card className="border-border/30 bg-card/60">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LogIn className="w-5 h-5 text-orange-400" />
                Partner Login
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
                  Sign In
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Don't have an account?{" "}
                <a href="/partner-signup" className="text-orange-400 hover:underline">Sign up as a partner</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const partner = dashboardQuery.data?.partner as any;
  const leads = (dashboardQuery.data?.leads as any[]) || [];
  const isLoading = dashboardQuery.isLoading;

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new" || !l.status).length,
    converted: leads.filter(l => l.status === "converted").length,
    contacted: leads.filter(l => l.status === "contacted").length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{partner?.companyName || "Partner"}</p>
              <p className="text-xs text-muted-foreground">Sales Squad Partner</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="border-border/50 text-xs">
            <LogOut className="w-3.5 h-3.5 mr-1.5" />Logout
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Leads", value: stats.total, icon: Users, color: "text-orange-400" },
            { label: "New Leads", value: stats.new, icon: TrendingUp, color: "text-blue-400" },
            { label: "Contacted", value: stats.contacted, icon: Clock, color: "text-yellow-400" },
            { label: "Converted", value: stats.converted, icon: CheckCircle, color: "text-green-400" },
          ].map(s => (
            <Card key={s.label} className="border-border/30 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/30`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Service Areas */}
        {partner?.serviceAreas && (
          <Card className="border-border/30 bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <span className="text-sm font-medium text-foreground">Service Areas: </span>
                <span className="text-sm text-muted-foreground">{partner.serviceAreas}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leads Table */}
        <Card className="border-border/30 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              Assigned Leads
              <Badge variant="outline" className="ml-auto text-orange-400 border-orange-500/30 bg-orange-500/10">
                {leads.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Leads Yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Sales Squad will assign leads to you as they come in. Check back soon!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead: any) => (
                  <div key={lead.id} className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border/30 hover:border-orange-500/20 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-orange-400">
                        {(lead.firstName || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground text-sm">
                          {lead.firstName} {lead.lastName}
                        </h4>
                        <StatusBadge status={lead.status || "new"} />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Phone className="w-3 h-3" />{lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Mail className="w-3 h-3" />{lead.email}
                          </a>
                        )}
                        {(lead.city || lead.state) && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />{[lead.city, lead.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </div>
                      {lead.monthlyEnergyBill && (
                        <p className="text-xs text-orange-400 mt-1">Monthly Bill: ₹{Number(lead.monthlyEnergyBill).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                      {lead.phone && (
                        <a
                          href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${lead.firstName}, I'm calling from Sales Squad regarding your solar inquiry. Is this a good time to talk?`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs bg-green-600/20 text-green-400 border border-green-500/30 rounded-md px-2 py-1 hover:bg-green-600/30 transition-colors"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
