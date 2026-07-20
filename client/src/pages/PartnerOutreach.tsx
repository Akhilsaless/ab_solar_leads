import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail, MapPin, CheckCircle, Clock, AlertCircle,
  MessageSquare, Sparkles, ExternalLink, Search,
  Phone, Globe, Star, Loader2, Building2
} from "lucide-react";
import { toast } from "sonner";

const INDIAN_CITIES = [
  "Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Pune",
  "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
  "Indore", "Chandigarh", "Surat", "Vadodara", "Nagpur",
  "Visakhapatnam", "Coimbatore", "Kochi", "Bhopal", "Patna"
];

const BUSINESS_TYPES = [
  { value: "solar companies", label: "Solar Companies" },
  { value: "solar installers", label: "Solar Installers" },
  { value: "renewable energy companies", label: "Renewable Energy" },
  { value: "electrical contractors", label: "Electrical Contractors" },
  { value: "construction companies", label: "Construction Companies" },
];

// Default pitches — about Sales Squad, NOT about solar panels
const DEFAULT_WHATSAPP_PITCH = (companyName: string, partnerUrl: string) =>
  `Hi ${companyName} Team 👋\n\nI'm reaching out from *Sales Squad* — we generate qualified solar leads using AI, 24/7.\n\nEvery lead we send you includes:\n✅ Customer name, phone & email\n✅ Monthly electricity bill amount\n✅ Location & GPS coordinates\n✅ AI-calculated lead score\n\nOur AI chatbot qualifies customers before we send the lead to you. You just close the deal — no cold calling, no marketing spend.\n\n👉 Sign up free as a partner: ${partnerUrl}\n\nLet me know if you'd like to discuss!`;

const DEFAULT_EMAIL_PITCH = (companyName: string, partnerUrl: string) =>
  `Hi ${companyName} Team,\n\nI'm reaching out from Sales Squad — an AI-powered lead generation platform built specifically for solar companies like yours.\n\nHere's how it works:\n1. A homeowner or business owner chats with our AI bot\n2. The bot qualifies them — captures their monthly electricity bill, location, and intent\n3. We send you the lead with full details: name, phone, email, bill amount, and GPS location\n\nYou receive leads that are already interested in solar. No cold calling, no marketing budget required from your side.\n\nWe're currently onboarding solar companies in ${companyName.includes("Hyderabad") ? "Hyderabad" : "your city"} — and the signup is completely free.\n\n👉 Sign up as a partner here: ${partnerUrl}\n\nLooking forward to partnering with you!\n\nBest regards,\nSales Squad Team`;

export default function PartnerOutreach() {
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("solar companies");
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [outreachMode, setOutreachMode] = useState<"email" | "whatsapp">("email");
  const [customMessage, setCustomMessage] = useState("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const partnerUrl = `${window.location.origin}/for-partners`;

  const searchMutation = trpc.scraper.search.useMutation({
    onError: (err) => toast.error(err.message || "Search failed"),
  });

  const partnersQuery = trpc.partner.getPartners.useQuery();

  const sendEmailMutation = trpc.partner.sendOutreachEmail.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully!");
      setShowOutreachDialog(false);
      setCustomMessage("");
      partnersQuery.refetch();
    },
    onError: (err) => toast.error(err.message || "Failed to send email"),
  });

  const generateAIPitch = trpc.partner.generateOutreachPitch.useMutation({
    onSuccess: (data: any) => {
      setCustomMessage(data.pitch);
      setIsGeneratingPitch(false);
    },
    onError: () => {
      // Fall back to default pitch
      const pitch = outreachMode === "whatsapp"
        ? DEFAULT_WHATSAPP_PITCH(selectedBusiness?.businessName || "", partnerUrl)
        : DEFAULT_EMAIL_PITCH(selectedBusiness?.businessName || "", partnerUrl);
      setCustomMessage(pitch);
      setIsGeneratingPitch(false);
    },
  });

  const handleSearch = () => {
    if (!selectedCity) { toast.error("Please select a city"); return; }
    setHasSearched(true);
    searchMutation.mutate({ businessType: selectedType, location: selectedCity });
  };

  const openMessenger = (business: any) => {
    const pitch = DEFAULT_WHATSAPP_PITCH(business.businessName, partnerUrl);
    navigator.clipboard.writeText(pitch);
    // Try to open their Facebook page if website is a FB URL, else open Messenger
    const fbUrl = business.website?.includes("facebook.com") ? business.website : `https://www.messenger.com/`;
    window.open(fbUrl, "_blank");
    toast.success("Pitch copied! Find the company on Messenger and paste to send.");
  };
  const openOutreachDialog = (business: any, mode: "email" | "whatsapp") => {
    setSelectedBusiness(business);
    setOutreachMode(mode);
    const pitch = mode === "whatsapp"
      ? DEFAULT_WHATSAPP_PITCH(business.businessName, partnerUrl)
      : DEFAULT_EMAIL_PITCH(business.businessName, partnerUrl);
    setCustomMessage(pitch);
    setShowOutreachDialog(true);
  };

  const handleGenerateAIPitch = () => {
    if (!selectedBusiness) return;
    setIsGeneratingPitch(true);
    generateAIPitch.mutate({
      companyName: selectedBusiness.businessName,
      city: selectedCity,
      mode: outreachMode,
      partnerUrl,
    });
  };

  const handleSend = () => {
    if (!selectedBusiness) return;
    if (outreachMode === "whatsapp") {
      const phone = selectedBusiness.phone?.replace(/\D/g, "");
      if (!phone) { toast.error("No phone number available for this company"); return; }
      const waUrl = `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(customMessage)}`;
      window.open(waUrl, "_blank");
      sendEmailMutation.mutate({
        companyName: selectedBusiness.businessName,
        email: selectedBusiness.email || "noemail@placeholder.com",
        phone: selectedBusiness.phone,
        serviceAreas: [selectedCity],
        customMessage: `[WhatsApp sent] ${customMessage}`,
        skipEmail: true,
      });
      toast.success("WhatsApp opened! Send the message to complete outreach.");
      setShowOutreachDialog(false);
    } else {
      if (!selectedBusiness.email) { toast.error("No email available for this company"); return; }
      sendEmailMutation.mutate({
        companyName: selectedBusiness.businessName,
        email: selectedBusiness.email,
        phone: selectedBusiness.phone,
        serviceAreas: [selectedCity],
        customMessage: customMessage || undefined,
      });
    }
  };

  const getPartnerStatus = (email: string, phone: string) => {
    const partners = (partnersQuery.data as any[]) || [];
    const partner = partners.find((p: any) => p.email === email || p.phone === phone);
    return partner?.status || null;
  };

  const getStatusBadge = (status: string | null) => {
    if (status === "signed_up") return (
      <Badge variant="outline" className="text-green-400 border-green-500/30 bg-green-500/10 text-xs">
        <CheckCircle className="w-3 h-3 mr-1" />Signed Up
      </Badge>
    );
    if (status === "email_sent") return (
      <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10 text-xs">
        <Clock className="w-3 h-3 mr-1" />Contacted
      </Badge>
    );
    return null;
  };

  // Safely extract businesses from mutation result
  const businesses: any[] = (searchMutation.data as any)?.businesses ?? [];
  const isSearching = searchMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partner Outreach</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Find solar companies on Google Maps and recruit them as Sales Squad partners.
          </p>
        </div>
        <a
          href="/for-partners"
          target="_blank"
          className="flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Partner Page
        </a>
      </div>

      {/* Search */}
      <Card className="border-border/30 bg-card/60">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_CITIES.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={!selectedCity || isSearching}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSearching
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</>
                  : <><Search className="w-4 h-4 mr-2" />Search Live</>
                }
              </Button>
            </div>
          </div>
          {isSearching && (
            <p className="text-muted-foreground text-sm mt-3 text-center">
              Searching Google Maps for {selectedType} in {selectedCity}... This may take 15-30 seconds.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {isSearching ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-orange-400" />
          <p className="text-muted-foreground text-sm">Fetching companies and extracting contact details...</p>
        </div>
      ) : businesses.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{businesses.length}</span> companies found in {selectedCity}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businesses.map((business: any, idx: number) => {
              const status = getPartnerStatus(business.email || "", business.phone || "");
              const hasEmail = !!business.email;
              const hasPhone = !!business.phone;
              return (
                <Card key={business.id || idx} className="border-border/30 bg-card/60">
                  <CardContent className="p-4 space-y-3">
                    {/* Name + status */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm leading-tight">{business.businessName}</h3>
                      {getStatusBadge(status)}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5">
                      {business.address && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="text-xs line-clamp-1">{business.address}</span>
                        </div>
                      )}
                      {business.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          <a href={`tel:${business.phone}`} className="text-xs font-medium text-foreground hover:text-orange-400">{business.phone}</a>
                        </div>
                      )}
                      {business.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          <a href={`mailto:${business.email}`} className="text-xs text-orange-400 hover:underline truncate">{business.email}</a>
                        </div>
                      )}
                      {business.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 hover:underline truncate">
                            {business.website.replace(/^https?:\/\//, "").slice(0, 35)}
                          </a>
                        </div>
                      )}
                      {business.rating && (
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium text-foreground">{business.rating}</span>
                          {business.reviewCount > 0 && <span className="text-xs text-muted-foreground">({business.reviewCount} reviews)</span>}
                        </div>
                      )}
                    </div>

                    {/* Outreach buttons */}
                    {status === "signed_up" ? (
                      <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                        <CheckCircle className="w-4 h-4" /> Active Partner
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {hasPhone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOutreachDialog(business, "whatsapp")}
                            className="text-xs h-7 border-green-500/40 text-green-400 hover:bg-green-500/10"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />WhatsApp
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMessenger(business)}
                          className="text-xs h-7 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Building2 className="w-3.5 h-3.5 mr-1" />Messenger
                        </Button>
                        {hasEmail && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOutreachDialog(business, "email")}
                            className="text-xs h-7 border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
                          >
                            <Mail className="w-3.5 h-3.5 mr-1" />Email
                          </Button>
                        )}
                        {!hasEmail && !hasPhone && (
                          <span className="text-muted-foreground text-xs italic">No contact info found</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : hasSearched && !isSearching ? (
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No companies found in {selectedCity}. Try a different city or business type.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/30 bg-card/60">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">Find Solar Companies to Partner With</p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Select a city and click "Search Live" to find solar companies from Google Maps. Then pitch them to sign up as Sales Squad partners.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Outreach Dialog */}
      <Dialog open={showOutreachDialog} onOpenChange={setShowOutreachDialog}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {outreachMode === "whatsapp"
                ? <><MessageSquare className="w-5 h-5 text-green-400" />WhatsApp Outreach</>
                : <><Mail className="w-5 h-5 text-blue-400" />Email Outreach</>
              }
            </DialogTitle>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3 text-sm">
                <span className="font-semibold text-foreground">{selectedBusiness.businessName}</span>
                {outreachMode === "email" && selectedBusiness.email && (
                  <span className="text-muted-foreground ml-2">→ {selectedBusiness.email}</span>
                )}
                {outreachMode === "whatsapp" && selectedBusiness.phone && (
                  <span className="text-muted-foreground ml-2">→ {selectedBusiness.phone}</span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Message</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateAIPitch}
                    disabled={isGeneratingPitch}
                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 text-xs"
                  >
                    {isGeneratingPitch
                      ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                      : <><Sparkles className="w-3 h-3 mr-1" />AI Personalise</>
                    }
                  </Button>
                </div>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={10}
                  className="text-sm resize-none"
                  placeholder="Your outreach message..."
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  This message pitches Sales Squad's lead generation platform to recruit them as a partner.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowOutreachDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sendEmailMutation.isPending || !customMessage.trim()}
                  className={outreachMode === "whatsapp"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                  }
                >
                  {sendEmailMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                    : outreachMode === "whatsapp" ? "Open WhatsApp" : "Send Email"
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
