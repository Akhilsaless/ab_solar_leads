import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function ReferrerSignup() {
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");
  const [acceptedTnC, setAcceptedTnC] = useState(false);

  const sendOtp = trpc.referrer.sendOtp.useMutation({
    onSuccess: () => {
      setStep("otp");
      setError("");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to send OTP");
    },
  });

  const verifyOtp = trpc.referrer.verifyOtpAndSignup.useMutation({
    onSuccess: (data: any) => {
      setUniqueCode(data.uniqueCode);
      localStorage.setItem("referrerCode", data.uniqueCode);
      localStorage.setItem("referrerEmail", email);
      setStep("success");
      setError("");
    },
    onError: (err: any) => {
      setError(err.message || "Invalid OTP");
    },
  });

  const handleSendOtp = () => {
    if (!name || !email) { setError("Please fill all fields"); return; }
    if (!acceptedTnC) { setError("Please accept the Terms & Conditions to continue"); return; }
    sendOtp.mutate({ name, email, acceptedTnC });
  };

  const handleVerifyOtp = () => {
    if (!otp) { setError("Please enter OTP"); return; }
    verifyOtp.mutate({ email, otp });
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur">
          <div className="p-8 text-center space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Sales Squad!</h2>
              <p className="text-gray-300">Your account is ready. Share your link to start earning.</p>
            </div>
            <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">Your Unique Code:</p>
              <p className="text-2xl font-bold text-orange-500 font-mono">{uniqueCode}</p>
            </div>
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">Your Referral Link:</p>
              <p className="text-sm text-blue-300 break-all font-mono">
                {window.location.origin}/referral-landing/{uniqueCode}
              </p>
              <Button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/referral-landing/${uniqueCode}`)}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
              >
                Copy Link
              </Button>
            </div>
            <Button onClick={() => (window.location.href = `/referrer/dashboard?code=${uniqueCode}`)} className="w-full bg-orange-600 hover:bg-orange-700">
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Earn with Sales Squad</h1>
            <p className="text-gray-300">Refer customers and earn ₹500–₹1,500 per referral</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {step === "form" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="your@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                />
              </div>

              {/* T&C Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setAcceptedTnC(!acceptedTnC)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    acceptedTnC ? "bg-orange-500 border-orange-500" : "border-white/40 bg-white/5"
                  }`}
                >
                  {acceptedTnC && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-300">
                  I agree to the{" "}
                  <Link href="/terms-referral" className="text-orange-400 underline hover:text-orange-300 inline-flex items-center gap-0.5">
                    Terms & Conditions <ExternalLink className="w-3 h-3" />
                  </Link>
                  {" "}including the fake lead policy. I understand that fake or invalid leads will result in permanent account suspension and forfeiture of all earnings.
                </span>
              </label>

              <Button
                onClick={handleSendOtp}
                disabled={sendOtp.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {sendOtp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send OTP"}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">OTP sent to {email}</p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Enter OTP</label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 text-center text-2xl tracking-widest"
                />
              </div>
              <Button
                onClick={handleVerifyOtp}
                disabled={verifyOtp.isPending}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {verifyOtp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Signup"}
              </Button>
              <Button onClick={() => setStep("form")} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Back
              </Button>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-xs text-gray-400">
              ✓ ₹500 when your referral applies for govt subsidy<br />
              ✓ ₹1,500 when solar is installed<br />
              ✓ Bonus ₹100–₹300+ per referral via daily tasks<br />
              ✓ Auto-payout to UPI/Bank anytime
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
