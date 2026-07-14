import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ReferrerSignup() {
  const [step, setStep] = useState<"form" | "otp" | "success">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [uniqueCode, setUniqueCode] = useState("");

  const sendOtp = trpc.referrer.sendOtp.useMutation({
    onSuccess: (data: any) => {
      setStep("otp");
      setError("");
      // If testOtp is returned, show it in the UI for development
      if (data.testOtp) {
        console.log("Test OTP:", data.testOtp);
        setOtp(data.testOtp);
      }
    },
    onError: (err: any) => {
      setError(err.message || "Failed to send OTP");
    },
  });

  const verifyOtp = trpc.referrer.verifyOtpAndSignup.useMutation({
    onSuccess: (data: any) => {
      setUniqueCode(data.uniqueCode);
      setStep("success");
      setError("");
    },
    onError: (err: any) => {
      setError(err.message || "Invalid OTP");
    },
  });

  const handleSendOtp = () => {
    if (!name || !phone || !email) {
      setError("Please fill all fields");
      return;
    }
    sendOtp.mutate({ name, phone, email });
  };

  const handleVerifyOtp = () => {
    if (!otp) {
      setError("Please enter OTP");
      return;
    }
    verifyOtp.mutate({ phone, otp });
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur">
          <div className="p-8 text-center space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to AB SOLAR Referral Program!</h2>
              <p className="text-gray-300">Your account is ready. Share your unique code to start earning.</p>
            </div>
            <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">Your Unique Code:</p>
              <p className="text-2xl font-bold text-orange-500 font-mono">{uniqueCode}</p>
            </div>
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">Your Referral Link:</p>
              <p className="text-sm text-blue-300 break-all font-mono">
                absolarleads-xxxqwsn9.manus.space/refer/{uniqueCode}
              </p>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(`absolarleads-xxxqwsn9.manus.space/refer/${uniqueCode}`);
                }}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
              >
                Copy Link
              </Button>
            </div>
            <Button onClick={() => (window.location.href = "/referrer/dashboard")} className="w-full bg-orange-600 hover:bg-orange-700">
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
            <h1 className="text-3xl font-bold text-white mb-2">Earn with AB SOLAR</h1>
            <p className="text-gray-300">Refer customers and earn ₹500-₹1500 per referral</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number"
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
              <p className="text-sm text-gray-300">OTP sent to {phone}</p>
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
              <Button
                onClick={() => setStep("form")}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
            </div>
          )}

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-xs text-gray-400">
              ✓ Earn ₹500 per signup + ₹1500 per installation<br />
              ✓ Unlimited referrals, unlimited earnings<br />
              ✓ Auto-payout to UPI/Bank anytime<br />
              ✓ Monthly leaderboard with bonuses
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
