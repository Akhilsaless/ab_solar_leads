import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search, Building2, MapPin, Phone, Globe, Star,
  Loader2, Factory, Hotel, School, Hospital,
  ShoppingBag, Warehouse, Utensils, Dumbbell, Building,
  ExternalLink, Download, MessageCircle, Sparkles,
  Linkedin, TrendingUp, Mail
} from "lucide-react";

// Same as admin scraper but WITHOUT solar companies/installers
const BUSINESS_TYPES = [
  { value: "factories", label: "Factories & Manufacturing", icon: Factory },
  { value: "hotels", label: "Hotels & Resorts", icon: Hotel },
  { value: "hospitals", label: "Hospitals & Clinics", icon: Hospital },
  { value: "schools", label: "Schools & Colleges", icon: School },
  { value: "shopping malls", label: "Shopping Malls & Retail", icon: ShoppingBag },
  { value: "warehouses", label: "Warehouses & Cold Storage", icon: Warehouse },
  { value: "restaurants", label: "Restaurants & Food Courts", icon: Utensils },
  { value: "gyms", label: "Gyms & Sports Centers", icon: Dumbbell },
  { value: "offices", label: "Office Buildings & IT Parks", icon: Building },
  { value: "dairy farms", label: "Dairy & Agriculture", icon: Building2 },
  { value: "textile mills", label: "Textile Mills", icon: Factory },
  { value: "cold storage", label: "Cold Storage Facilities", icon: Warehouse },
  { value: "housing societies", label: "Housing Societies & Apartments", icon: Building },
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal",
];

const CONTACT_STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not Contacted", color: "text-gray-400 border-gray-500/30 bg-gray-500/10" },
  { value: "contacted", label: "Contacted", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { value: "interested", label: "Interested", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  { value: "converted", label: "Converted", color: "text-green-400 border-green-500/30 bg-green-500/10" },
];

function solarScore(biz: any): number {
  let score = 0;
  if (biz.businessSize === "large") score += 40;
  else if (biz.businessSize === "medium") score += 25;
  else score += 10;
  const highTypes = ["factor","textile","cold storage","warehouse","hospital","hotel"];
  if (highTypes.some(t => (biz.businessType || "").toLowerCase().includes(t))) score += 30;
  else score += 15;
  if (biz.rating && biz.rating >= 4) score += 15;
  else if (biz.rating && biz.rating >= 3) score += 8;
  if (biz.phone) score += 10;
  if (biz.website) score += 5;
  return Math.min(score, 100);
}

function SolarScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-400 border-green-500/30 bg-green-500/10"
    : score >= 45 ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
    : "text-gray-400 border-gray-500/30 bg-gray-500/10";
  const label = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";
  return (
    <Badge variant="outline" className={`text-xs ${color} flex items-center gap-1`}>
      <TrendingUp className="w-3 h-3" />
      {label} ({score})
    </Badge>
  );
}

interface Props {
  referralLink: string;
  referrerName: string;
}

export default function ReferrerScraper({ referralLink, referrerName }: Props) {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [generatingPitch, setGeneratingPitch] = useState<number | null>(null);
  const [expandedPitch, setExpandedPitch] = useState<number | null>(null);
  const [outreachBiz, setOutreachBiz] = useState<any>(null);
  const [outreachMode, setOutreachMode] = useState<"email" | "whatsapp">("whatsapp");
  const [outreachMsg, setOutreachMsg] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const searchMutation = trpc.scraper.search.useMutation({
    onSuccess: (data) => {
      toast.success(`Found ${(data as any).total} businesses!`);
      resultsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const resultsQuery = trpc.scraper.results.useQuery({
    businessType: businessType || undefined,
    businessSize: sizeFilter !== "all" ? sizeFilter : undefined,
    state: (state && state !== "all") ? state : undefined,
  });

  const updateStatusMutation = trpc.scraper.updateContactStatus.useMutation({
    onSuccess: () => resultsQuery.refetch(),
  });

  const generatePitchMutation = trpc.scraper.generateAIPitch.useMutation({
    onSuccess: (data) => {
      setGeneratingPitch(null);
      setExpandedPitch(null);
      resultsQuery.refetch();
      toast.success("AI pitch generated!");
    },
    onError: () => { setGeneratingPitch(null); toast.error("Failed to generate pitch"); },
  });

  const sendEmailMutation = trpc.partner.referrerSendOutreachEmail.useMutation({
    onSuccess: () => {
      toast.success("Email sent!");
      setOutreachBiz(null);
      setSendingEmail(false);
      updateStatusMutation.mutate({ businessId: outreachBiz?.id, contactStatus: "contacted" });
    },
    onError: (err) => { toast.error(err.message); setSendingEmail(false); },
  });

  const businesses = (resultsQuery.data as any[]) || [];
  const sortedBusinesses = useMemo(() =>
    [...businesses].sort((a, b) => solarScore(b) - solarScore(a)),
    [businesses]
  );

  const defaultPitch = (biz: any) =>
    `Hi ${biz.businessName} Team! 🌞\n\nI'm ${referrerName}. I wanted to share a free tool that shows exactly how much your business can save on electricity with solar.\n\nIt takes 2 minutes and there's no commitment:\n👉 ${referralLink}\n\nIncludes: savings estimate, govt subsidy eligibility, and payback period. Check it out!`;

  const openOutreach = (biz: any, mode: "email" | "whatsapp") => {
    setOutreachBiz(biz);
    setOutreachMode(mode);
    const pitch = biz.aiPitch
      ? `${biz.aiPitch}\n\nCheck it out: ${referralLink}`
      : defaultPitch(biz);
    setOutreachMsg(pitch);
  };

  const handleSend = () => {
    if (!outreachBiz) return;
    if (outreachMode === "whatsapp") {
      const phone = (outreachBiz.phone || "").replace(/\D/g, "");
      if (!phone) { toast.error("No phone number for this business"); return; }
      window.open(`https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(outreachMsg)}`, "_blank");
      updateStatusMutation.mutate({ businessId: outreachBiz.id, contactStatus: "contacted" });
      toast.success("WhatsApp opened!");
      setOutreachBiz(null);
    } else {
      if (!outreachBiz.email) { toast.error("No email for this business"); return; }
      setSendingEmail(true);
      sendEmailMutation.mutate({
        businessEmail: outreachBiz.email,
        businessName: outreachBiz.businessName,
        referrerName,
        referralLink,
        customMessage: outreachMsg,
      });
    }
  };

  const exportCSV = () => {
    const rows = sortedBusinesses.map(b => [
      b.businessName, b.businessType, b.businessSize, b.phone || "", b.email || "",
      b.address || "", b.city || "", b.state || "", b.rating || "", b.reviewCount || "",
      b.website || "", solarScore(b), b.contactStatus || "not_contacted"
    ]);
    const headers = ["Name","Type","Size","Phone","Email","Address","City","State","Rating","Reviews","Website","SolarScore","Status"];
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "solar-outreach.csv"; a.click();
    toast.success("CSV exported!");
  };

  const openLinkedIn = (biz: any) => {
    const url = biz.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(biz.businessName + " owner")}`;
    window.open(url, "_blank");
  };

  const stats = useMemo(() => ({
    highPotential: businesses.filter(b => solarScore(b) >= 70).length,
    large: businesses.filter(b => b.businessSize === "large").length,
    medium: businesses.filter(b => b.businessSize === "medium").length,
    small: businesses.filter(b => b.businessSize === "small").length,
  }), [businesses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Find Leads — Business Outreach</h1>
        <p className="text-muted-foreground text-sm mt-1">Search businesses in your city. Send your referral link via WhatsApp or Email. When they sign up, you earn!</p>
      </div>

      {/* Search Form */}
      <Card className="border-border/30 bg-card/60">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Business Type</label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2"><t.icon className="w-4 h-4" />{t.label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">City / Area</label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Hyderabad" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">State</label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="All states" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => searchMutation.mutate({ businessType, location, state: state !== "all" ? state : "" })}
              disabled={searchMutation.isPending || !businessType || !location}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              {searchMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Search Businesses
            </Button>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="small">Small</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {businesses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "High Potential", value: stats.highPotential, color: "text-green-400" },
            { label: "Large", value: stats.large, color: "text-orange-400" },
            { label: "Medium", value: stats.medium, color: "text-yellow-400" },
            { label: "Small", value: stats.small, color: "text-gray-400" },
          ].map(s => (
            <Card key={s.label} className="border-border/30 bg-card/60">
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Actions bar */}
      {businesses.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={exportCSV} className="border-border/50 text-sm">
            <Download className="w-4 h-4 mr-1.5" />Export CSV
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">{businesses.length} found · sorted by solar potential</span>
        </div>
      )}

      {/* Results */}
      {resultsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>
      ) : sortedBusinesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedBusinesses.map((biz: any) => {
            const score = solarScore(biz);
            const statusInfo = CONTACT_STATUS_OPTIONS.find(s => s.value === (biz.contactStatus || "not_contacted")) || CONTACT_STATUS_OPTIONS[0];
            return (
              <Card key={biz.id} className="border-border/30 bg-card/60 transition-all duration-200">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{biz.businessName}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/30 bg-orange-500/10">
                          {(biz.businessSize?.charAt(0).toUpperCase() + biz.businessSize?.slice(1)) || "Unknown"}
                        </Badge>
                        <SolarScoreBadge score={score} />
                        <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {biz.address && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="line-clamp-1 text-xs">{biz.address}</span></div>}
                    {biz.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><span className="text-xs font-medium text-foreground">{biz.phone}</span></div>}
                    {biz.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><span className="text-xs text-foreground">{biz.email}</span></div>}
                    {biz.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:underline truncate">
                          {biz.website.replace(/^https?:\/\//, "").slice(0, 30)}<ExternalLink className="w-3 h-3 inline ml-1" />
                        </a>
                      </div>
                    )}
                    {biz.rating && (
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">{biz.rating}</span>
                        <span className="text-xs text-muted-foreground">({biz.reviewCount} reviews)</span>
                      </div>
                    )}
                  </div>

                  {/* AI Pitch */}
                  {biz.aiPitch && expandedPitch === biz.id && (
                    <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                      <p className="text-xs text-foreground leading-relaxed">{biz.aiPitch}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="text-xs h-7 border-border/50"
                          onClick={() => { navigator.clipboard.writeText(`${biz.aiPitch}\n\nCheck it out: ${referralLink}`); toast.success("Copied!"); }}>
                          Copy
                        </Button>
                        {biz.phone && (
                          <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                            onClick={() => openOutreach(biz, "whatsapp")}>
                            <MessageCircle className="w-3 h-3 mr-1" />WhatsApp
                          </Button>
                        )}
                        {biz.email && (
                          <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white border-0"
                            onClick={() => openOutreach(biz, "email")}>
                            <Mail className="w-3 h-3 mr-1" />Email
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Status:</span>
                    <Select value={biz.contactStatus || "not_contacted"}
                      onValueChange={(val) => updateStatusMutation.mutate({ businessId: biz.id, contactStatus: val as any })}>
                      <SelectTrigger className="h-7 text-xs flex-1 border-border/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTACT_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {biz.phone && (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-border/50" onClick={() => openOutreach(biz, "whatsapp")}>
                        <MessageCircle className="w-3.5 h-3.5 mr-1 text-green-400" />WhatsApp
                      </Button>
                    )}
                    {biz.email && (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-border/50" onClick={() => openOutreach(biz, "email")}>
                        <Mail className="w-3.5 h-3.5 mr-1 text-blue-400" />Email
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs h-7 border-border/50" onClick={() => openLinkedIn(biz)}>
                      <Linkedin className="w-3.5 h-3.5 mr-1 text-blue-400" />LinkedIn
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 border-border/50"
                      disabled={generatingPitch === biz.id}
                      onClick={() => {
                        if (biz.aiPitch) { setExpandedPitch(expandedPitch === biz.id ? null : biz.id); return; }
                        setGeneratingPitch(biz.id);
                        generatePitchMutation.mutate({ businessId: biz.id });
                      }}>
                      {generatingPitch === biz.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-400" />}
                      {biz.aiPitch ? (expandedPitch === biz.id ? "Hide Pitch" : "Show Pitch") : "AI Pitch"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : businesses.length === 0 && !resultsQuery.isLoading ? (
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Businesses Found Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Select a business type and city above, then click "Search Businesses".</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Outreach Dialog */}
      <Dialog open={!!outreachBiz} onOpenChange={() => setOutreachBiz(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {outreachMode === "whatsapp"
                ? <><MessageCircle className="w-5 h-5 text-green-400" /> WhatsApp Outreach</>
                : <><Mail className="w-5 h-5 text-blue-400" /> Email Outreach</>
              }
            </DialogTitle>
          </DialogHeader>
          {outreachBiz && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <span className="font-semibold">{outreachBiz.businessName}</span>
                <span className="text-muted-foreground ml-2">
                  {outreachMode === "email" ? `→ ${outreachBiz.email}` : `→ ${outreachBiz.phone}`}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message (your referral link is included)</label>
                <Textarea
                  value={outreachMsg}
                  onChange={e => setOutreachMsg(e.target.value)}
                  rows={7}
                  className="text-sm"
                />
              </div>
              {outreachMode === "whatsapp" && (
                <p className="text-xs text-muted-foreground bg-green-500/10 border border-green-500/20 rounded p-2">
                  WhatsApp will open with this message pre-filled. Just hit Send.
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setOutreachBiz(null)}>Cancel</Button>
                <Button
                  onClick={handleSend}
                  disabled={sendingEmail}
                  className={outreachMode === "whatsapp" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                >
                  {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {outreachMode === "whatsapp" ? "Open WhatsApp" : "Send Email"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
