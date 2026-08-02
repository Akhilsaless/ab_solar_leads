import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Building2, Phone, Mail, MapPin, FileDown,
  Globe, Star, MessageCircle, Sparkles, Loader2,
  ExternalLink, User, TrendingUp, RefreshCw, Zap
} from "lucide-react";
import { toast } from "sonner";

const CONTACT_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "converted", label: "Converted" },
];

const statusColor: Record<string, string> = {
  not_contacted: "text-gray-400 border-gray-500/30 bg-gray-500/10",
  contacted: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  interested: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  converted: "text-green-400 border-green-500/30 bg-green-500/10",
};

function solarScore(biz: any): number {
  let score = 0;
  if (biz.businessSize === "large") score += 40;
  else if (biz.businessSize === "medium") score += 25;
  else score += 10;
  const highTypes = ["factor", "textile", "cold storage", "warehouse", "hospital", "hotel"];
  if (highTypes.some(t => (biz.businessType || "").toLowerCase().includes(t))) score += 30;
  else score += 15;
  if (biz.rating && Number(biz.rating) >= 4) score += 15;
  else if (biz.rating && Number(biz.rating) >= 3) score += 8;
  if (biz.phone) score += 10;
  if (biz.website) score += 5;
  return Math.min(score, 100);
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-400 border-green-500/30 bg-green-500/10"
    : score >= 45 ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
    : "text-gray-400 border-gray-500/30 bg-gray-500/10";
  return (
    <Badge variant="outline" className={`text-xs ${color} flex items-center gap-1`}>
      <TrendingUp className="w-3 h-3" />
      {score >= 70 ? "High" : score >= 45 ? "Medium" : "Low"} ({score})
    </Badge>
  );
}

export default function ScrapedContacts() {
  const [search, setSearch] = useState("");
  const [contactStatus, setContactStatus] = useState("all");
  const [generatingPitch, setGeneratingPitch] = useState<number | null>(null);
  const [expandedPitch, setExpandedPitch] = useState<number | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const [extractingEmail, setExtractingEmail] = useState<number | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const { data: businesses = [], isLoading, refetch } = trpc.scraper.allBusinesses.useQuery({
    search: search || undefined,
    contactStatus: contactStatus !== "all" ? contactStatus : undefined,
  });

  const updateStatusMutation = trpc.scraper.updateContactStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(err.message),
  });

  const generatePitchMutation = trpc.scraper.generateAIPitch.useMutation({
    onSuccess: (_data, vars) => {
      toast.success("AI pitch ready!");
      setGeneratingPitch(null);
      setExpandedPitch(vars.businessId);
      refetch();
    },
    onError: (err) => { toast.error(err.message); setGeneratingPitch(null); },
  });

  const reExtractEmailMutation = trpc.scraper.reExtractEmail.useMutation({
    onSuccess: (data) => {
      setExtractingEmail(null);
      if ((data as any).success) {
        toast.success(`Email found: ${(data as any).email}`);
      } else {
        toast.info((data as any).message || "No email found on website");
      }
      refetch();
    },
    onError: (err) => { toast.error(err.message); setExtractingEmail(null); },
  });

  const bulkGeneratePitchesMutation = trpc.scraper.bulkGenerateAIPitches.useMutation({
    onSuccess: (data) => {
      setBulkGenerating(false);
      toast.success(`AI pitches generated for ${(data as any).processed} businesses!`);
      refetch();
    },
    onError: (err) => { toast.error(err.message); setBulkGenerating(false); },
  });

  const sendEmailMutation = trpc.scraper.sendOutreachEmail.useMutation({
    onSuccess: (_data, vars) => {
      toast.success("Email sent!");
      setSendingEmail(null);
      refetch();
    },
    onError: (err) => { toast.error(err.message); setSendingEmail(null); },
  });

  const openWhatsApp = (biz: any, pitch?: string) => {
    const msg = pitch || `Hi, I'm from Sales Squad. We help ${biz.businessType || "businesses"} like ${biz.businessName} cut electricity bills by up to 80% with solar. Govt subsidy up to Rs 78,000 available. Can we discuss?`;
    const phone = (biz.phone || "").replace(/[^0-9]/g, "");
    if (phone) {
      window.open(`https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      toast.success("No phone — pitch copied to clipboard!");
    }
  };

  const sendOutreachEmail = (biz: any) => {
    if (!biz.email) { toast.error("No email address for this business"); return; }
    const pitch = biz.aiPitch || `Hi,\n\nI'm from Sales Squad. We help ${biz.businessType || "businesses"} like ${biz.businessName} cut electricity bills by up to 80% with solar.\n\nThe Government of India's PM Surya Ghar scheme offers subsidies up to ₹78,000. For a ${biz.businessSize || "medium"} business like yours, the payback period is typically 3-5 years.\n\nWould you like a free solar assessment?\n\nBest regards,\nSales Squad Team`;
    setSendingEmail(biz.id);
    sendEmailMutation.mutate({
      businessId: biz.id,
      toEmail: biz.email,
      subject: `Solar Energy Savings for ${biz.businessName} — Sales Squad`,
      body: pitch,
    });
  };

  const exportCSV = () => {
    if (!(businesses as any[]).length) { toast.error("No contacts to export"); return; }
    const headers = ["Business Name", "Type", "Size", "Owner", "Phone", "Email", "Website", "City", "State", "Rating", "Reviews", "Solar Score", "Status"];
    const rows = (businesses as any[]).map((b: any) => [
      b.businessName, b.businessType || "", b.businessSize || "", b.ownerName || "",
      b.phone || "", b.email || "", b.website || "",
      b.city || "", b.state || "", b.rating || "", b.reviewCount || "",
      solarScore(b), b.contactStatus || "not_contacted",
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `scraped-contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("CSV exported!");
  };

  const bizList = businesses as any[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scraped Contacts</h1>
          <p className="text-muted-foreground text-sm mt-1">All businesses found via the Business Scraper — with full details and outreach tools.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            disabled={bulkGenerating || bizList.length === 0}
            onClick={() => {
              const agencyId = bizList[0]?.agencyId;
              if (!agencyId) { toast.error("No contacts to process"); return; }
              setBulkGenerating(true);
              bulkGeneratePitchesMutation.mutate({ agencyId });
            }}
            className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
          >
            {bulkGenerating
              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating...</>
              : <><Zap className="w-4 h-4 mr-1.5" />Generate All Pitches</>
            }
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="border-border/50">
            <FileDown className="w-4 h-4 mr-1.5" />Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/30 bg-card/60">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={contactStatus} onValueChange={setContactStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {bizList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: bizList.length, color: "text-foreground" },
            { label: "Not Contacted", value: bizList.filter(b => !b.contactStatus || b.contactStatus === "not_contacted").length, color: "text-gray-400" },
            { label: "Contacted", value: bizList.filter(b => b.contactStatus === "contacted").length, color: "text-blue-400" },
            { label: "Converted", value: bizList.filter(b => b.contactStatus === "converted").length, color: "text-green-400" },
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

      {/* Business Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        </div>
      ) : bizList.length === 0 ? (
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Scraped Contacts Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Go to Business Scraper, search for businesses, and they will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bizList.map((biz: any) => {
            const score = solarScore(biz);
            const statusInfo = CONTACT_STATUS_OPTIONS.find(s => s.value === (biz.contactStatus || "not_contacted")) || CONTACT_STATUS_OPTIONS[1];
            return (
              <Card key={biz.id} className="border-border/30 bg-card/60">
                <CardContent className="p-4 space-y-3">
                  {/* Business name + badges */}
                  <div>
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{biz.businessName}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {biz.businessType && (
                        <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/30 bg-orange-500/10 capitalize">
                          {biz.businessType}
                        </Badge>
                      )}
                      {biz.businessSize && (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-border/50 capitalize">
                          {biz.businessSize}
                        </Badge>
                      )}
                      <ScoreBadge score={score} />
                      <Badge variant="outline" className={`text-xs ${statusColor[biz.contactStatus || "not_contacted"]}`}>
                        {statusInfo.label}
                      </Badge>
                      {(biz as any).emailSentAt && (
                        <Badge variant="outline" className="text-xs text-blue-300 border-blue-500/30 bg-blue-500/10">
                          Emailed {new Date((biz as any).emailSentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </Badge>
                      )}
                      {(biz as any).followUp3dSent && (
                        <Badge variant="outline" className="text-xs text-purple-300 border-purple-500/30 bg-purple-500/10">
                          Day 3 sent
                        </Badge>
                      )}
                      {(biz as any).followUp7dSent && (
                        <Badge variant="outline" className="text-xs text-orange-300 border-orange-500/30 bg-orange-500/10">
                          Day 7 sent
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5">
                    {biz.ownerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-xs text-foreground font-medium">{biz.ownerName}</span>
                      </div>
                    )}
                    {biz.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="text-xs line-clamp-1">{biz.address}</span>
                      </div>
                    )}
                    {biz.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <a href={`tel:${biz.phone}`} className="text-xs font-medium text-foreground hover:text-orange-400">{biz.phone}</a>
                      </div>
                    )}
                    {biz.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        <a href={`mailto:${biz.email}`} className="text-xs text-orange-400 hover:underline truncate">{biz.email}</a>
                      </div>
                    )}
                    {biz.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:underline truncate">
                          {biz.website.replace(/^https?:\/\//, "").slice(0, 35)}<ExternalLink className="w-3 h-3 inline ml-1" />
                        </a>
                      </div>
                    )}
                    {biz.rating && (
                      <div className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium text-foreground">{biz.rating}</span>
                        {biz.reviewCount > 0 && <span className="text-xs text-muted-foreground">({biz.reviewCount} reviews)</span>}
                      </div>
                    )}
                  </div>

                  {/* AI Pitch expanded */}
                  {biz.aiPitch && expandedPitch === biz.id && (
                    <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                      <p className="text-xs text-foreground leading-relaxed">{biz.aiPitch}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Button size="sm" variant="outline" className="text-xs h-7 border-border/50"
                          onClick={() => { navigator.clipboard.writeText(biz.aiPitch); toast.success("Copied!"); }}>
                          Copy
                        </Button>
                        <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                          onClick={() => openWhatsApp(biz, biz.aiPitch)}>
                          <MessageCircle className="w-3 h-3 mr-1" />Send on WhatsApp
                        </Button>
                        {biz.email && (
                          <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white border-0"
                            disabled={sendingEmail === biz.id}
                            onClick={() => sendOutreachEmail(biz)}>
                            {sendingEmail === biz.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />}
                            Send Email
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Status dropdown */}
                    <Select
                      value={biz.contactStatus || "not_contacted"}
                      onValueChange={(val) => updateStatusMutation.mutate({ businessId: biz.id, contactStatus: val as any })}
                    >
                      <SelectTrigger className="h-7 text-xs w-36 border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_contacted" className="text-xs">Not Contacted</SelectItem>
                        <SelectItem value="contacted" className="text-xs">Contacted</SelectItem>
                        <SelectItem value="interested" className="text-xs">Interested</SelectItem>
                        <SelectItem value="converted" className="text-xs">Converted</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* WhatsApp */}
                    <Button size="sm" variant="outline" className="text-xs h-7 border-border/50"
                      onClick={() => openWhatsApp(biz)}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1 text-green-400" />WhatsApp
                    </Button>

                    {/* Email button — only if email available; otherwise show Get Email if website exists */}
                    {biz.email ? (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-border/50"
                        disabled={sendingEmail === biz.id}
                        onClick={() => sendOutreachEmail(biz)}>
                        {sendingEmail === biz.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1 text-blue-400" />}
                        Email
                      </Button>
                    ) : biz.website ? (
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        disabled={extractingEmail === biz.id}
                        onClick={() => { setExtractingEmail(biz.id); reExtractEmailMutation.mutate({ businessId: biz.id }); }}>
                        {extractingEmail === biz.id
                          ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                        Get Email
                      </Button>
                    ) : null}

                    {/* AI Pitch */}
                    <Button size="sm" variant="outline" className="text-xs h-7 border-border/50"
                      disabled={generatingPitch === biz.id}
                      onClick={() => {
                        if (biz.aiPitch) { setExpandedPitch(expandedPitch === biz.id ? null : biz.id); return; }
                        setGeneratingPitch(biz.id);
                        generatePitchMutation.mutate({ businessId: biz.id });
                      }}>
                      {generatingPitch === biz.id
                        ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-400" />}
                      {biz.aiPitch ? (expandedPitch === biz.id ? "Hide Pitch" : "Show Pitch") : "AI Pitch"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
