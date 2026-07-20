import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MapPin, CheckCircle, Clock, AlertCircle, MessageSquare, Sparkles, ExternalLink, Search } from "lucide-react";
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

const DEFAULT_WHATSAPP_PITCH = (companyName: string, partnerUrl: string) =>
  `Hi ${companyName} Team 👋\n\nI'm reaching out from *Sales Squad* — we generate qualified solar leads using AI, 24/7.\n\nEvery lead includes:\n✅ Customer name, phone & email\n✅ Monthly electricity bill amount\n✅ Location & GPS coordinates\n✅ AI-calculated lead score\n\nCustomers are already interested — our chatbot qualifies them before we send the lead to you. You just close the deal.\n\n👉 Learn more & sign up free: ${partnerUrl}\n\nLet me know if you'd like to discuss!`;

const DEFAULT_EMAIL_PITCH = (companyName: string, partnerUrl: string) =>
  `Hi ${companyName} Team,\n\nI'm reaching out from Sales Squad — we help solar companies grow by generating qualified leads using AI.\n\nHere's how it works:\n1. A property owner chats with our AI bot\n2. The bot qualifies them (bill amount, location, intent)\n3. We send you the lead with full details — name, phone, email, bill, location\n\nYou get leads that are already interested. No cold calling, no marketing spend from your side.\n\nSign up free here: ${partnerUrl}\n\nLooking forward to partnering with you!\n\nBest regards,\nSales Squad Team`;

export default function PartnerOutreach() {
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("solar companies");
  const [showOutreachDialog, setShowOutreachDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [outreachMode, setOutreachMode] = useState<"email" | "whatsapp">("email");
  const [customMessage, setCustomMessage] = useState("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const partnerUrl = `${window.location.origin}/for-partners`;

  // Live search using the same scraper.search mutation as BusinessScraper
  const searchMutation = trpc.scraper.search.useMutation();

  const partnersQuery = trpc.partner.getPartners.useQuery();

  const sendEmailMutation = trpc.partner.sendOutreachEmail.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully!");
      setShowOutreachDialog(false);
      setCustomMessage("");
      partnersQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send email");
    },
  });

  const generateAIPitch = trpc.partner.generateOutreachPitch.useMutation({
    onSuccess: (data: any) => {
      setCustomMessage(data.pitch);
      setIsGeneratingPitch(false);
    },
    onError: () => {
      const pitch = outreachMode === "whatsapp"
        ? DEFAULT_WHATSAPP_PITCH(selectedBusiness?.businessName || "", partnerUrl)
        : DEFAULT_EMAIL_PITCH(selectedBusiness?.businessName || "", partnerUrl);
      setCustomMessage(pitch);
      setIsGeneratingPitch(false);
    },
  });

  const handleSearch = () => {
    if (!selectedCity) { toast.error("Please select a city"); return; }
    setSearchTriggered(true);
    searchMutation.mutate({ businessType: selectedType, location: selectedCity });
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
        email: selectedBusiness.email || "",
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
    if (status === "signed_up") return <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3 h-3" /> Signed Up</span>;
    if (status === "email_sent") return <span className="flex items-center gap-1 text-yellow-400 text-xs"><Clock className="w-3 h-3" /> Contacted</span>;
    return <span className="text-gray-500 text-xs">Not contacted</span>;
  };

  const businesses: any[] = searchMutation.data?.businesses || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Partner Outreach</h1>
            <p className="text-gray-400">Search solar companies live from Google Maps and reach out via Email or WhatsApp</p>
          </div>
          <a
            href="/for-partners"
            target="_blank"
            className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg px-4 py-2"
          >
            <ExternalLink className="w-4 h-4" /> View Partner Page
          </a>
        </div>

        {/* Search */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {INDIAN_CITIES.map(city => (
                    <SelectItem key={city} value={city} className="text-white">{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {BUSINESS_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value} className="text-white">{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={!selectedCity || searchMutation.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Search className="w-4 h-4 mr-2" />
                {searchMutation.isPending ? "Searching Google Maps..." : "Search Live"}
              </Button>
            </div>
          </div>
          {searchMutation.isPending && (
            <p className="text-gray-400 text-sm mt-3 text-center">Searching Google Maps for {selectedType} in {selectedCity}... This may take 10-20 seconds.</p>
          )}
        </div>

        {/* Results */}
        {businesses.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-white font-semibold">{businesses.length} companies found in {selectedCity}</span>
              <span className="text-gray-400 text-sm">Click Email or WhatsApp to start outreach</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50 border-b border-slate-600">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Company</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Phone</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Outreach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {businesses.map((business: any, idx: number) => {
                    const status = getPartnerStatus(business.email || "", business.phone || "");
                    const hasEmail = !!business.email;
                    const hasPhone = !!business.phone;
                    return (
                      <tr key={business.id || idx} className="hover:bg-slate-700/20 transition">
                        <td className="px-5 py-4">
                          <div className="text-sm text-white font-medium">{business.businessName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{business.address}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-400">{business.phone || <span className="text-gray-600 italic">No phone</span>}</td>
                        <td className="px-5 py-4 text-sm text-gray-400">{business.email || <span className="text-gray-600 italic">No email</span>}</td>
                        <td className="px-5 py-4">{getStatusBadge(status)}</td>
                        <td className="px-5 py-4">
                          {status === "signed_up" ? (
                            <span className="text-green-400 text-sm font-medium">✅ Active Partner</span>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {hasPhone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openOutreachDialog(business, "whatsapp")}
                                  className="border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs px-3"
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
                                </Button>
                              )}
                              {hasEmail && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openOutreachDialog(business, "email")}
                                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 text-xs px-3"
                                >
                                  <Mail className="w-3 h-3 mr-1" /> Email
                                </Button>
                              )}
                              {!hasEmail && !hasPhone && (
                                <span className="text-gray-600 text-xs italic">No contact info</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {searchTriggered && businesses.length === 0 && !searchMutation.isPending && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No companies found in {selectedCity}. Try a different city or business type.</p>
          </div>
        )}

        {!searchTriggered && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Select a city and click "Search Live" to find solar companies from Google Maps</p>
            <p className="text-gray-500 text-sm mt-2">Results are fetched live — no pre-loading needed</p>
          </div>
        )}

        {/* Outreach Dialog */}
        <Dialog open={showOutreachDialog} onOpenChange={setShowOutreachDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {outreachMode === "whatsapp"
                  ? <><MessageSquare className="w-5 h-5 text-green-400" /> WhatsApp Outreach</>
                  : <><Mail className="w-5 h-5 text-blue-400" /> Email Outreach</>
                }
              </DialogTitle>
            </DialogHeader>
            {selectedBusiness && (
              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-gray-300">
                  <span className="font-semibold text-white">{selectedBusiness.businessName}</span>
                  {outreachMode === "email" && selectedBusiness.email && (
                    <span className="text-gray-400 ml-2">→ {selectedBusiness.email}</span>
                  )}
                  {outreachMode === "whatsapp" && selectedBusiness.phone && (
                    <span className="text-gray-400 ml-2">→ {selectedBusiness.phone}</span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Message</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateAIPitch}
                      disabled={isGeneratingPitch}
                      className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 text-xs"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {isGeneratingPitch ? "Generating..." : "AI Generate Pitch"}
                    </Button>
                  </div>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={10}
                    className="bg-slate-700 border-slate-600 text-white text-sm resize-none"
                    placeholder="Your outreach message..."
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowOutreachDialog(false)} className="border-slate-600 text-gray-300">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sendEmailMutation.isPending || !customMessage.trim()}
                    className={outreachMode === "whatsapp" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                  >
                    {sendEmailMutation.isPending ? "Sending..." : outreachMode === "whatsapp" ? "Open WhatsApp" : "Send Email"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
