import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function PartnerSignup() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const registerMutation = trpc.partner.registerPartner.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Registration successful! You'll start receiving leads soon.");
      setTimeout(() => setLocation("/"), 3000);
    },
    onError: (err) => {
      toast.error(err.message || "Registration failed");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) newErrors.companyName = "Company name is required";
    if (!email.trim() || !email.includes("@")) newErrors.email = "Valid email is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    if (selectedStates.length === 0) newErrors.states = "Select at least one service area";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    registerMutation.mutate({
      token,
      companyName,
      email,
      phone,
      whatsappNumber: whatsapp,
      serviceAreas: selectedStates,
    });
  };

  const toggleState = (state: string) => {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to Sales Squad!</h2>
          <p className="text-gray-400 mb-6">Your registration is complete. You'll start receiving qualified leads soon.</p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Join Sales Squad</h1>
          <p className="text-gray-400">Register your solar company to receive qualified leads</p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Name *</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                className={`bg-slate-700 border-slate-600 text-white ${errors.companyName ? "border-red-500" : ""}`}
              />
              {errors.companyName && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.companyName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@company.com"
                className={`bg-slate-700 border-slate-600 text-white ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className={`bg-slate-700 border-slate-600 text-white ${errors.phone ? "border-red-500" : ""}`}
              />
              {errors.phone && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.phone}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp Number (Optional)</label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            {/* Service Areas */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Service Areas (States) *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {INDIAN_STATES.map(state => (
                  <label key={state} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedStates.includes(state)}
                      onCheckedChange={() => toggleState(state)}
                      className="border-slate-600"
                    />
                    <span className="text-sm text-gray-300">{state}</span>
                  </label>
                ))}
              </div>
              {errors.states && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.states}
                </p>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-slate-700/50 border border-slate-600 rounded p-4">
              <p className="text-sm text-gray-300">
                ✅ Once registered, you'll receive qualified solar leads from our AI chatbot<br/>
                ✅ Leads include customer contact info, monthly bill amount, and location<br/>
                ✅ You handle the installation — Sales Squad earns a commission per kW installed<br/>
                ✅ Commission rate is finalized upon agreement with Sales Squad
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={registerMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
