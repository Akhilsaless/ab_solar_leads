import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Building2, MapPin, Phone, Globe, Star,
  UserPlus, Loader2, Factory, Hotel, School, Hospital,
  ShoppingBag, Warehouse, Utensils, Dumbbell, Building,
  ExternalLink, Download, MessageCircle, CheckSquare,
  Square, Sparkles, Linkedin, TrendingUp, Sun, Mail
} from "lucide-react";

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
  { value: "solar companies", label: "Solar Companies & Installers", icon: Sun },
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

function EvidenceScoreBadge({ evidence }: { evidence?: any }) {
  const score = evidence?.score ?? 0;
  const tier = evidence?.tier || "insufficient_evidence";
  const color = tier === "sales_ready" ? "text-green-400 border-green-500/30 bg-green-500/10"
    : tier === "research_first" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
    : tier === "blocked" ? "text-red-400 border-red-500/30 bg-red-500/10"
    : "text-gray-400 border-gray-500/30 bg-gray-500/10";
  const label = tier.replace(/_/g, " ");
  return (
    <Badge variant="outline" className={`text-xs ${color} flex items-center gap-1`}>
      <TrendingUp className="w-3 h-3" />
      {label} ({score})
    </Badge>
  );
}

export default function BusinessScraper() {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [generatingPitch, setGeneratingPitch] = useState<number | null>(null);
  const [expandedPitch, setExpandedPitch] = useState<number | null>(null);

  const searchMutation = trpc.scraper.search.useMutation({
    onSuccess: (data) => { toast.success(`Found ${data.total} businesses!`); resultsQuery.refetch(); setSelectedIds(new Set()); },
    onError: (err) => toast.error(err.message),
  });

  const resultsQuery = trpc.scraper.results.useQuery({
    businessType: businessType || undefined,
    businessSize: sizeFilter !== "all" ? sizeFilter : undefined,
    state: (state && state !== "all") ? state : undefined,
  });

  const importMutation = trpc.scraper.importAsLead.useMutation({
    onSuccess: () => { toast.success("Imported as lead!"); resultsQuery.refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const bulkImportMutation = trpc.scraper.bulkImport.useMutation({
    onSuccess: (data) => { toast.success(`${data.imported} businesses imported!`); resultsQuery.refetch(); setSelectedIds(new Set()); },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.scraper.updateContactStatus.useMutation({
    onSuccess: () => resultsQuery.refetch(),
    onError: (err) => toast.error(err.message),
  });

  const generatePitchMutation = trpc.scraper.generateAIPitch.useMutation({
    onSuccess: (_data, vars) => { toast.success("AI pitch ready!"); setGeneratingPitch(null); setExpandedPitch(vars.businessId); resultsQuery.refetch(); },
    onError: (err) => { toast.error(err.message); setGeneratingPitch(null); },
  });

  const businesses: any[] = resultsQuery.data || [];

  const sortedBusinesses = useMemo(() => [...businesses].sort((a, b) => (b.evidenceScore?.score || 0) - (a.evidenceScore?.score || 0)), [businesses]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleSelectAll = () => {
    const ids = sortedBusinesses.filter(b => !b.isImported).map(b => b.id);
    setSelectedIds(selectedIds.size === ids.length ? new Set() : new Set(ids));
  };

  const exportCSV = () => {
    const rows = sortedBusinesses.map(b => [
      b.businessName, b.businessType, b.businessSize, b.phone || "", b.email || "",
      b.address || "", b.city || "", b.state || "", b.rating || "", b.reviewCount || "",
      b.website || "", b.evidenceScore?.score || 0, b.evidenceScore?.tier || "insufficient_evidence", b.contactStatus || "not_contacted", b.isImported ? "Yes" : "No"
    ]);
    const headers = ["Name","Type","Size","Phone","Email","Address","City","State","Rating","Reviews","Website","EvidenceScore","EvidenceTier","Status","Imported"];
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "solar-leads.csv"; a.click();
    toast.success("CSV exported!");
  };

  const openWhatsApp = (biz: any, pitch?: string) => {
    const msg = pitch || `Hi, I'm from Sales Squad. We help businesses review whether solar could reduce daytime electricity costs. Any benefit is preliminary and depends on the electricity bill and site assessment. Would a short conversation be useful?`;
    const phone = biz.phone?.replace(/[^0-9]/g, "");
    if (phone) window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    else { navigator.clipboard.writeText(msg); toast.success("No phone — pitch copied to clipboard!"); }
  };

  const openLinkedIn = (biz: any) => {
    const url = biz.linkedinUrl || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(biz.businessName + " owner")}`;
    window.open(url, "_blank");
  };

  const stats = useMemo(() => ({
    highPotential: businesses.filter(b => b.evidenceScore?.tier === "sales_ready").length,
    large: businesses.filter(b => b.businessSize === "large").length,
    medium: businesses.filter(b => b.businessSize === "medium").length,
    small: businesses.filter(b => b.businessSize === "small").length,
    imported: businesses.filter(b => b.isImported).length,
  }), [businesses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Lead Finder</h1>
        <p className="text-muted-foreground text-sm mt-1">Find commercial prospects from Google Maps, then rank them using recorded evidence before outreach.</p>
      </div>

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
            <Button onClick={() => searchMutation.mutate({ businessType, location, state: state !== "all" ? state : "" })}
              disabled={searchMutation.isPending || !businessType || !location}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
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

      {businesses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Sales-ready evidence", value: stats.highPotential, color: "text-green-400" },
            { label: "Large", value: stats.large, color: "text-orange-400" },
            { label: "Medium", value: stats.medium, color: "text-yellow-400" },
            { label: "Small", value: stats.small, color: "text-gray-400" },
            { label: "Imported", value: stats.imported, color: "text-blue-400" },
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

      {businesses.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={toggleSelectAll} className="border-border/50 text-sm">
            {selectedIds.size === sortedBusinesses.filter(b => !b.isImported).length
              ? <><CheckSquare className="w-4 h-4 mr-1.5" />Deselect All</>
              : <><Square className="w-4 h-4 mr-1.5" />Select All</>}
          </Button>
          {selectedIds.size > 0 && (
            <Button size="sm" onClick={() => bulkImportMutation.mutate({ businessIds: Array.from(selectedIds) })}
              disabled={bulkImportMutation.isPending}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm">
              {bulkImportMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1.5" />}
              Import {selectedIds.size} Selected
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV} className="border-border/50 text-sm">
            <Download className="w-4 h-4 mr-1.5" />Export CSV
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">{businesses.length} found · sorted by Evidence Score</span>
        </div>
      )}

      {resultsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>
      ) : sortedBusinesses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedBusinesses.map((biz: any) => {
            const statusInfo = CONTACT_STATUS_OPTIONS.find(s => s.value === (biz.contactStatus || "not_contacted")) || CONTACT_STATUS_OPTIONS[0];
            const isSelected = selectedIds.has(biz.id);
            return (
              <Card key={biz.id} className={`border-border/30 bg-card/60 transition-all duration-200 ${isSelected ? "ring-2 ring-orange-500/50" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    {!biz.isImported && (
                      <button onClick={() => toggleSelect(biz.id)} className="mt-0.5 shrink-0 text-muted-foreground hover:text-orange-400 transition-colors">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{biz.businessName}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-xs text-orange-400 border-orange-500/30 bg-orange-500/10">
                          {(biz.businessSize?.charAt(0).toUpperCase() + biz.businessSize?.slice(1)) || "Unknown"}
                        </Badge>
                        <EvidenceScoreBadge evidence={biz.evidenceScore} />
                        <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {biz.address && <div className="flex items-start gap-2 text-muted-foreground"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="line-clamp-1 text-xs">{biz.address}</span></div>}
                    {biz.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><span className="text-xs font-medium text-foreground">{biz.phone}</span></div>}
                    {biz.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /><a href={`mailto:${biz.email}`} className="text-xs text-orange-400 hover:underline truncate">{biz.email}</a></div>}
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

                  {biz.aiPitch && expandedPitch === biz.id && (
                    <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                      <p className="text-xs text-foreground leading-relaxed">{biz.aiPitch}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="text-xs h-7 border-border/50"
                          onClick={() => { navigator.clipboard.writeText(biz.aiPitch); toast.success("Copied!"); }}>Copy</Button>
                        <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                          onClick={() => openWhatsApp(biz, biz.aiPitch)}>
                          <MessageCircle className="w-3 h-3 mr-1" />Send on WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}

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

                  <div className="flex flex-wrap gap-2 pt-1">
                    {biz.isImported ? (
                      <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10">✓ Imported</Badge>
                    ) : (
                      <Button size="sm" onClick={() => importMutation.mutate({ businessId: biz.id })}
                        disabled={importMutation.isPending}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs h-7">
                        <UserPlus className="w-3.5 h-3.5 mr-1" />Import Lead
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs h-7 border-border/50" onClick={() => openWhatsApp(biz)}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1 text-green-400" />WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 border-border/50" onClick={() => openLinkedIn(biz)}>
                      <Linkedin className="w-3.5 h-3.5 mr-1 text-blue-400" />LinkedIn
                    </Button>
                    {biz.email && (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-border/50" asChild>
                        <a href={`mailto:${biz.email}?subject=Preliminary%20solar%20review%20for%20${encodeURIComponent(biz.businessName)}&body=${encodeURIComponent(`Hi,\n\nI'm from Sales Squad. We help businesses review whether solar may reduce daytime electricity costs. Any benefit is preliminary and depends on a recent bill and site assessment.\n\nWould a short discussion be useful?\n\nBest regards,\nSales Squad Team`)}`} target="_blank" rel="noopener noreferrer">
                          <Mail className="w-3.5 h-3.5 mr-1 text-blue-400" />Email
                        </a>
                      </Button>
                    )}
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
    </div>
  );
}
