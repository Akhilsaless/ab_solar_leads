import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, TrendingUp, Users, Zap } from "lucide-react";

export function HostelReferrerSignup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hostel, setHostel] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // Submit to backend
      // Will be implemented with WhatsApp integration
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setName("");
        setPhone("");
      }, 3000);
    } catch (error) {
      alert("Error submitting form");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Welcome to Sales Squad!</h2>
            <p className="text-gray-600">
              Check your WhatsApp for your referral link and start earning!
            </p>
            <p className="text-sm text-gray-500">
              You'll receive your unique referral link and earnings dashboard link via WhatsApp.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Sales Squad</h1>
          <p className="text-lg text-gray-600">Earn ₹20k-50k/month from home</p>
          <Badge className="mx-auto bg-green-600">No Experience Needed</Badge>
        </div>

        {/* Earnings Breakdown */}
        <Card className="bg-white border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">How Much Can You Earn?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">Per Lead Capture</span>
              <span className="text-xl font-bold text-green-600">₹20</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium">Subsidy Verification</span>
              <span className="text-xl font-bold text-blue-600">₹500</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium">Installation Commission</span>
              <span className="text-xl font-bold text-purple-600">₹1,500</span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-semibold">Per Successful Lead</span>
              <span className="text-2xl font-bold text-green-600">₹2,020</span>
            </div>
          </CardContent>
        </Card>

        {/* Why Join */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Why Join Sales Squad?</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">Share a link, earn money - that's it!</p>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">Perfect for students, travelers, anyone</p>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">Instant payouts to your UPI account</p>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle>Get Started Now</CardTitle>
            <CardDescription>Join thousands earning with Sales Squad</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone">WhatsApp Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="hostel">Your Hostel (Optional)</Label>
                <Input
                  id="hostel"
                  placeholder="Hostel name"
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2" size="lg">
                Get My Referral Link
              </Button>

              <p className="text-xs text-gray-500 text-center">
                We'll send your referral link via WhatsApp. No spam, just earnings!
              </p>
            </form>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-base">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                <span className="text-sm text-gray-700">Share your referral link on WhatsApp, Instagram, Facebook</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                <span className="text-sm text-gray-700">People click → Get free solar estimate</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                <span className="text-sm text-gray-700">They get solar installed → You earn ₹2,020</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">4</span>
                <span className="text-sm text-gray-700">Money goes to your UPI account automatically</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          By signing up, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
