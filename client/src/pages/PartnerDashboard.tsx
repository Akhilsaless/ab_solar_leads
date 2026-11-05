import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { normalizeIndianPhone } from "@shared/solarWorkflow";
import PartnerOnboardingWizard from "@/components/PartnerOnboardingWizard";
import PartnerSalesOperations from "@/components/PartnerSalesOperations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sun, LogIn, LogOut, Phone, Mail, MapPin,
  Users, TrendingUp, Clock, CheckCircle, Loader2,
  Upload, FileText, Package, Megaphone, Bell, ChevronDown,
  Zap, IndianRupee, Calendar, BarChart2
} from "lucide-react";

const STORAGE_KEY = "partner_token";

type Tab = "leads" | "setup" | "profile" | "marketing" | "operations";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    contacted: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    converted: "text-green-400 border-green-500/30 bg-green-500/10",
    lost: "text-red-400 border-red-500/30 bg-red-500/10",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${map[status] || map.new}`}>
      {status}
    </Badge>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="border-border/30 bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border/30">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnerDashboard() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem(STORAGE_KEY));
  const [activeTab, setActiveTab] = useState<Tab>("leads");
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingTabInitialized, setOnboardingTabInitialized] = useState(false);
  const [updatingLead, setUpdatingLead] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState<"pricingSheet" | "productList" | null>(null);
  const pricingRef = useRef<HTMLInputElement>(null);
  const productRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ products: "", pricing: "", discounts: "", phone: "", whatsappNumber: "" });

  const loginMutation = trpc.partner.partnerLogin.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(STORAGE_KEY, data.token);
      setToken(data.token);
      setIsLoggedIn(true);
      setOnboardingTabInitialized(false);
      toast.success(`Welcome back, ${data.companyName}!`);
    },
    onError: (err) => toast.error(err.message),
  });

  const leadsQuery = trpc.partner.getMyLeadsDetailed.useQuery(
    { token },
    { enabled: isLoggedIn && !!token }
  );

  const statsQuery = trpc.partner.getMyStats.useQuery(
    { token },
    { enabled: isLoggedIn && !!token }
  );

  const profileQuery = trpc.partner.getPartnerProfile.useQuery(
    { token },
    { enabled: isLoggedIn && !!token }
  );

  const onboardingQuery = trpc.partner.getMyOnboarding.useQuery(
    { token },
    { enabled: isLoggedIn && !!token }
  );

  useEffect(() => {
    const status = (onboardingQuery.data as any)?.mapping?.onboardingStatus;
    if (!onboardingTabInitialized && status) {
      setOnboardingReady(status === "ready");
      if (status !== "ready") setActiveTab("setup");
      setOnboardingTabInitialized(true);
    }
  }, [onboardingQuery.data, onboardingTabInitialized]);

  const updateStatusMutation = trpc.partner.updateLeadStatus.useMutation({
    onSuccess: () => {
      leadsQuery.refetch();
      statsQuery.refetch();
      setUpdatingLead(null);
      toast.success("Lead status updated");
    },
    onError: (err) => { toast.error(err.message); setUpdatingLead(null); },
  });

  const uploadFileMutation = trpc.partner.uploadPartnerFile.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      setUploadingFile(null);
      toast.success("File uploaded successfully!");
    },
    onError: (err) => { toast.error(err.message); setUploadingFile(null); },
  });

  const updateProfileMutation = trpc.partner.updateProfile.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      setEditOpen(false);
      toast.success("Profile updated successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const notifyMeMutation = trpc.partner.notifyMeMarketing.useMutation({
    onSuccess: () => toast.success("We'll notify you when Marketing Automation is available!"),
    onError: (err) => toast.error(err.message),
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Enter email and password"); return; }
    loginMutation.mutate({ email, password });
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(""); setIsLoggedIn(false); setEmail(""); setPassword(""); setOnboardingReady(false); setOnboardingTabInitialized(false);
  };

  const handleFileUpload = async (file: File, fileType: "pricingSheet" | "productList") => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast.error("File too large. Max 4MB."); return; }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowedTypes.includes(file.type)) { toast.error("Use a PDF, PNG, JPG, CSV, or XLSX file."); return; }
    setUploadingFile(fileType);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.readAsDataURL(file);
      });
      uploadFileMutation.mutate({ token, fileName: file.name, contentType: file.type as any, contentBase64, fileType });
    } catch (e) {
      toast.error("Upload failed. Please try again.");
      setUploadingFile(null);
    }
  };

  const handleStatusChange = (leadId: number, status: string) => {
    setUpdatingLead(leadId);
    updateStatusMutation.mutate({ token, leadId, status: status as any });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
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
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@company.com" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Password</label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold" disabled={loginMutation.isPending}>
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

  const profile = profileQuery.data as any;
  const leads = (leadsQuery.data as any[]) || [];
  const stats = statsQuery.data || { total: 0, new: 0, contacted: 0, converted: 0, lost: 0 };
  const isLoading = leadsQuery.isLoading;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "leads", label: "My Leads", icon: Users },
    { id: "operations", label: "Surveys & Sales", icon: Calendar },
    { id: "setup", label: onboardingReady ? "Business Settings" : "Finish Setup", icon: Zap },
    { id: "profile", label: "Company Profile", icon: FileText },
    { id: "marketing", label: "Marketing", icon: Megaphone },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{profile?.companyName || "Partner"}</p>
              <p className="text-xs text-muted-foreground">Sales Squad Partner</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0 border-border/50 text-xs">
            <LogOut className="w-3.5 h-3.5 mr-1.5" />Logout
          </Button>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto px-4 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!onboardingReady && tab.id !== "setup"}
              title={!onboardingReady && tab.id !== "setup" ? "Complete Business Setup to unlock this section." : undefined}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {activeTab === "operations" && <PartnerSalesOperations token={token} />}

        {/* ── LEADS TAB ── */}
        {activeTab === "leads" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Leads" value={stats.total} icon={Users} color="text-orange-400" />
              <StatCard label="New" value={stats.new} icon={TrendingUp} color="text-blue-400" />
              <StatCard label="Contacted" value={stats.contacted} icon={Clock} color="text-yellow-400" />
              <StatCard label="Converted" value={stats.converted} icon={CheckCircle} color="text-green-400" />
            </div>

            {/* Leads List */}
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
                      <div key={lead.id} className="p-4 rounded-xl bg-background/50 border border-border/30 hover:border-orange-500/20 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-orange-400">
                              {(lead.firstName || "?")[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-foreground text-sm">{lead.firstName} {lead.lastName}</h4>
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
                            {/* Bill + Solar Estimate */}
                            <div className="flex flex-wrap gap-3 mt-2">
                              {lead.monthlyEnergyBill && (
                                <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-0.5">
                                  <IndianRupee className="w-3 h-3" />Bill: ₹{Number(lead.monthlyEnergyBill).toLocaleString()}/mo
                                </span>
                              )}
                              {lead.recommendedKw && (
                                <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-2 py-0.5">
                                  <Zap className="w-3 h-3" />{Number(lead.recommendedKw).toFixed(1)} kW system
                                </span>
                              )}
                              {lead.netCost && (
                                <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-0.5">
                                  <IndianRupee className="w-3 h-3" />Net cost: ₹{Number(lead.netCost).toLocaleString()}
                                </span>
                              )}
                              {lead.subsidyAmount && (
                                <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-0.5">
                                  <BarChart2 className="w-3 h-3" />Subsidy: ₹{Number(lead.subsidyAmount).toLocaleString()}
                                </span>
                              )}
                              {lead.estimatedSavingsMonthly && (
                                <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-md px-2 py-0.5">
                                  <TrendingUp className="w-3 h-3" />Saves ₹{Number(lead.estimatedSavingsMonthly).toLocaleString()}/mo
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <p className="text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                            {lead.phone && normalizeIndianPhone(lead.phone) && (
                              <a
                                href={`https://wa.me/${normalizeIndianPhone(lead.phone)!.slice(1)}?text=${encodeURIComponent(`Hi ${lead.firstName}, I'm calling from Sales Squad regarding your solar inquiry. Is this a good time to talk?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs bg-green-600/20 text-green-400 border border-green-500/30 rounded-md px-2 py-1 hover:bg-green-600/30 transition-colors"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                        {/* Status Update */}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Update status:</span>
                          {(["contacted"] as const).map(s => (
                            <button
                              key={s}
                              disabled={updatingLead === lead.id || (lead.status || "new") === s}
                              onClick={() => handleStatusChange(lead.id, s)}
                              className={`text-xs px-2.5 py-1 rounded-md border transition-colors disabled:opacity-40 ${
                                "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                              } ${(lead.status || "new") === s ? "opacity-40 cursor-default" : ""}`}
                            >
                              {updatingLead === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── SETUP & SETTINGS TAB ── */}
        {activeTab === "setup" && (
          <PartnerOnboardingWizard
            token={token}
            onReadyChange={(ready) => {
              setOnboardingReady(ready);
              onboardingQuery.refetch();
              profileQuery.refetch();
            }}
          />
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Company Info */}
            <Card className="border-border/30 bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-400" />
                  Company Information
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs"
                  onClick={() => {
                    setEditForm({
                      products: profile?.products || "",
                      pricing: profile?.pricing || "",
                      discounts: profile?.discounts || "",
                      phone: profile?.phone || "",
                      whatsappNumber: profile?.whatsappNumber || "",
                    });
                    setEditOpen(!editOpen);
                  }}
                >
                  {editOpen ? "Cancel" : "Edit Profile"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {profileQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Company Name", value: profile?.companyName },
                        { label: "Email", value: profile?.email },
                        { label: "Phone", value: profile?.phone },
                        { label: "WhatsApp", value: profile?.whatsappNumber },
                        { label: "Service Areas", value: Array.isArray(profile?.serviceAreas) ? profile.serviceAreas.join(", ") : profile?.serviceAreas },
                        { label: "Status", value: profile?.status },
                      ].map(f => f.value ? (
                        <div key={f.label}>
                          <p className="text-xs text-muted-foreground mb-0.5">{f.label}</p>
                          <p className="text-sm text-foreground font-medium">{f.value}</p>
                        </div>
                      ) : null)}
                    </div>
                    {profile?.products && (
                      <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <p className="text-xs text-orange-400 font-semibold mb-1">Products & Services</p>
                        <p className="text-sm text-foreground">{profile.products}</p>
                      </div>
                    )}
                    {profile?.pricing && (
                      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <p className="text-xs text-green-400 font-semibold mb-1">Pricing Details</p>
                        <p className="text-sm text-foreground">{profile.pricing}</p>
                      </div>
                    )}
                    {profile?.discounts && (
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                        <p className="text-xs text-blue-400 font-semibold mb-1">Current Discounts & Offers</p>
                        <p className="text-sm text-foreground">{profile.discounts}</p>
                      </div>
                    )}
                  </div>
                )}
                {editOpen && (
                  <div className="mt-4 p-4 rounded-lg border border-orange-500/20 bg-orange-500/5 space-y-3">
                    <p className="text-xs text-orange-400 font-semibold">Update Profile</p>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <Input value={editForm.phone} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))} className="mt-1 text-sm" placeholder="Phone number" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">WhatsApp</label>
                      <Input value={editForm.whatsappNumber} onChange={e => setEditForm(f => ({...f, whatsappNumber: e.target.value}))} className="mt-1 text-sm" placeholder="WhatsApp number" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Products & Services</label>
                      <textarea value={editForm.products} onChange={e => setEditForm(f => ({...f, products: e.target.value}))} className="mt-1 w-full text-sm bg-background border border-input rounded-md p-2 resize-none" rows={3} placeholder="e.g. 5kW, 10kW rooftop solar systems..." />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Pricing Details</label>
                      <textarea value={editForm.pricing} onChange={e => setEditForm(f => ({...f, pricing: e.target.value}))} className="mt-1 w-full text-sm bg-background border border-input rounded-md p-2 resize-none" rows={3} placeholder="e.g. ₹3.8 lakh per kW, 0% EMI..." />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Current Discounts & Offers</label>
                      <textarea value={editForm.discounts} onChange={e => setEditForm(f => ({...f, discounts: e.target.value}))} className="mt-1 w-full text-sm bg-background border border-input rounded-md p-2 resize-none" rows={2} placeholder="e.g. 15% off for factories this month..." />
                    </div>
                    <Button
                      className="w-full solar-gradient text-black font-semibold"
                      disabled={updateProfileMutation.isPending}
                      onClick={() => updateProfileMutation.mutate({ token, ...editForm })}
                    >
                      {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Sheet Upload */}
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-orange-400" />
                  Pricing Sheet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your pricing sheet (PDF or image). Our AI will use this to give customers accurate quotes during chat.
                </p>
                {profile?.pricingSheetUrl && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-sm text-green-400">Pricing sheet uploaded</span>
                    <a href={profile.pricingSheetUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-orange-400 hover:underline">View</a>
                  </div>
                )}
                <input
                  ref={pricingRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "pricingSheet"); }}
                />
                <Button
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  disabled={uploadingFile === "pricingSheet"}
                  onClick={() => pricingRef.current?.click()}
                >
                  {uploadingFile === "pricingSheet" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {profile?.pricingSheetUrl ? "Replace Pricing Sheet" : "Upload Pricing Sheet"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Accepted: PDF, JPG, PNG. Max 10MB.</p>
              </CardContent>
            </Card>

            {/* Product List Upload */}
            <Card className="border-border/30 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" />
                  Product List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your product catalogue (solar panels, inverters, batteries). Our AI will recommend your specific products to customers.
                </p>
                {profile?.productListUrl && (
                  <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-sm text-green-400">Product list uploaded</span>
                    <a href={profile.productListUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-orange-400 hover:underline">View</a>
                  </div>
                )}
                <input
                  ref={productRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "productList"); }}
                />
                <Button
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  disabled={uploadingFile === "productList"}
                  onClick={() => productRef.current?.click()}
                >
                  {uploadingFile === "productList" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {profile?.productListUrl ? "Replace Product List" : "Upload Product List"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Accepted: PDF, JPG, PNG. Max 10MB.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── MARKETING TAB ── */}
        {activeTab === "marketing" && (
          <div className="space-y-6">
            {/* Coming Soon Card */}
            <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-500/5 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Coming Soon</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  Marketing Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Automatically generate and post solar marketing content on Instagram, Facebook, and YouTube — without lifting a finger. Set your posting schedule and let AI handle the rest.
                </p>

                {/* Feature Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { icon: "📱", title: "Instagram & Facebook", desc: "AI-written posts, reels scripts, and ad creatives tailored to your solar business" },
                    { icon: "▶️", title: "YouTube", desc: "Auto-generate video scripts and thumbnails for solar education content" },
                    { icon: "📅", title: "Smart Scheduling", desc: "Choose 1–7 posts per day. AI picks the best time to post for maximum reach" },
                  ].map(f => (
                    <div key={f.title} className="p-3 rounded-xl bg-background/50 border border-border/30">
                      <div className="text-2xl mb-2">{f.icon}</div>
                      <p className="text-sm font-medium text-foreground mb-1">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <p className="text-sm font-medium text-orange-400 mb-1">Why run ads?</p>
                  <p className="text-sm text-muted-foreground">
                    Partners who run social media ads get <strong className="text-foreground">3–5x more leads</strong> than those who don't. Our AI handles everything — content, scheduling, and optimization. You just approve and grow.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
                    disabled={notifyMeMutation.isPending || notifyMeMutation.isSuccess}
                    onClick={() => notifyMeMutation.mutate({ token })}
                  >
                    {notifyMeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : notifyMeMutation.isSuccess ? (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <Bell className="w-4 h-4 mr-2" />
                    )}
                    {notifyMeMutation.isSuccess ? "You're on the list!" : "Notify Me When Available"}
                  </Button>
                  <p className="text-xs text-muted-foreground">We'll email you as soon as it launches.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
