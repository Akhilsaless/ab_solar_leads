import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const INDIAN_CITIES = [
  "Hyderabad", "Bengaluru", "Mumbai", "Delhi", "Pune",
  "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
  "Indore", "Chandigarh", "Surat", "Vadodara", "Nagpur"
];

const BUSINESS_TYPES = [
  "Solar Companies",
  "Solar Installers",
  "Renewable Energy",
  "Electrical Contractors",
  "Construction Companies"
];

export default function PartnerOutreach() {
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [customMessage, setCustomMessage] = useState("");

  const searchQuery = trpc.partner.searchBusinesses.useQuery(
    { city: selectedCity, businessType: selectedType },
    { enabled: !!selectedCity }
  );

  const partnersQuery = trpc.partner.getPartners.useQuery();
  const sendEmailMutation = trpc.partner.sendOutreachEmail.useMutation({
    onSuccess: () => {
      toast.success("Email sent successfully!");
      setShowEmailDialog(false);
      setCustomMessage("");
      partnersQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send email");
    },
  });

  const handleSendEmail = () => {
    if (!selectedBusiness) return;
    sendEmailMutation.mutate({
      companyName: selectedBusiness.businessName,
      email: selectedBusiness.email,
      phone: selectedBusiness.phone,
      serviceAreas: [selectedCity],
      customMessage: customMessage || undefined,
    });
  };

  const getPartnerStatus = (email: string) => {
    const partners = partnersQuery.data as any[] || [];
    const partner = partners.find((p: any) => p.email === email);
    if (!partner) return null;
    return partner.status;
  };

  const getStatusIcon = (status: string) => {
    if (status === "signed_up") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "email_sent") return <Clock className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Partner Outreach</h1>
          <p className="text-gray-400">Search and email solar companies to become Sales Squad partners</p>
        </div>

        {/* Search Section */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {INDIAN_CITIES.map(city => (
                    <SelectItem key={city} value={city} className="text-white hover:bg-slate-600">
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Business Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="" className="text-white hover:bg-slate-600">All types</SelectItem>
                  {BUSINESS_TYPES.map(type => (
                    <SelectItem key={type} value={type} className="text-white hover:bg-slate-600">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => searchQuery.refetch()}
                disabled={!selectedCity || searchQuery.isLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {searchQuery.isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {searchQuery.data && searchQuery.data.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50 border-b border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Company</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {(searchQuery.data as any[])?.map((business: any) => {
                    const status = getPartnerStatus(business.email);
                    return (
                      <tr key={business.id} className="hover:bg-slate-700/30 transition">
                        <td className="px-6 py-4 text-sm text-white font-medium">{business.businessName}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{business.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{business.phone}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {status && getStatusIcon(status)}
                            <span className="text-gray-400">
                              {status === "signed_up" && "✅ Signed Up"}
                              {status === "email_sent" && "⏳ Pending"}
                              {!status && "Not contacted"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {status === "signed_up" ? (
                            <span className="text-green-400 font-medium">Active Partner</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBusiness(business);
                                setShowEmailDialog(true);
                              }}
                              disabled={sendEmailMutation.isPending}
                              className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Send Email
                            </Button>
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

        {searchQuery.data && searchQuery.data.length === 0 && selectedCity && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No businesses found in {selectedCity}</p>
          </div>
        )}

        {!selectedCity && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">Select a city to search for solar companies</p>
          </div>
        )}

        {/* Email Dialog */}
        <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Outreach Email</DialogTitle>
            </DialogHeader>
            {selectedBusiness && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                  <Input
                    value={selectedBusiness.businessName}
                    disabled
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <Input
                    value={selectedBusiness.email}
                    disabled
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Custom Message (Optional)</label>
                  <Textarea
                    placeholder="Leave blank to use default message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white min-h-32"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmailDialog(false)}
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={sendEmailMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
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
