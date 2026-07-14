import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sun, TrendingUp, Gift, Users, Zap, ArrowRight } from "lucide-react";

export default function ReferralLanding() {
  const [, navigate] = useLocation();
  const [referrerCode, setReferrerCode] = useState<string>("");

  useEffect(() => {
    // Extract referrer code from URL path
    const pathParts = window.location.pathname.split("/");
    const code = pathParts[pathParts.length - 1];
    if (code && code !== "referral-landing") {
      setReferrerCode(code);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold text-white">AB SOLAR</span>
          </div>
          <div className="text-gray-300">Referral Commission Program</div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Earn ₹2,000 Commission Per Customer
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Your friend from AB SOLAR is offering you a commission for every customer you refer.
            <br />
            Share the link and earn ₹500 + ₹1,500 per customer!
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/referrer-signup")}
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-6 text-lg"
            >
              Start Earning Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              onClick={() =>
                navigate(referrerCode ? `/refer/${referrerCode}` : "/chat/ab-solar")
              }
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg"
            >
              Get Solar Estimate
            </Button>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 p-8 text-center">
            <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">₹20-₹100</h3>
            <p className="text-gray-300">Per Referral (Task Bonus)</p>
            <p className="text-sm text-gray-400 mt-2">When your referrals refer others</p>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 p-8 text-center">
            <Gift className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">₹500</h3>
            <p className="text-gray-300">Signup Bonus</p>
            <p className="text-sm text-gray-400 mt-2">When referral buys solar product</p>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 p-8 text-center">
            <Zap className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">₹1,500</h3>
            <p className="text-gray-300">Installation Bonus</p>
            <p className="text-sm text-gray-400 mt-2">When installation is completed</p>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="bg-white/10 border-white/20 p-12 mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">How It Works</h2>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Sign Up</h3>
              <p className="text-gray-300 text-sm">
                Create referrer account with OTP
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Get Link</h3>
              <p className="text-gray-300 text-sm">
                Get unique referral code
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Share</h3>
              <p className="text-gray-300 text-sm">
                Share link with friends
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Earn Tasks</h3>
              <p className="text-gray-300 text-sm">
                When they refer others
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                5
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Withdraw</h3>
              <p className="text-gray-300 text-sm">
                To UPI or Bank anytime
              </p>
            </div>
          </div>
        </Card>

        {/* Task System */}
        <Card className="bg-white/10 border-white/20 p-12 mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">How You Earn - Two Ways</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-orange-400 mb-6">Way 1: Task Bonuses</h3>
              <p className="text-gray-300 mb-6">Earn when your referrals refer others:</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <p className="text-white font-bold">Task 1: 5 Referrals</p>
                  <span className="text-orange-400">₹20 each</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <p className="text-white font-bold">Task 2: 5 More</p>
                  <span className="text-orange-400">₹40 each</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <p className="text-white font-bold">Task 3-5: Increasing</p>
                  <span className="text-orange-400">Up to ₹100</span>
                </div>
                <div className="flex items-center justify-between bg-orange-600/20 border border-orange-500/50 p-3 rounded-lg">
                  <p className="text-white font-bold">Forever</p>
                  <span className="text-orange-400">₹100 each</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-400 mb-6">Way 2: Direct Bonuses</h3>
              <p className="text-gray-300 mb-6">Earn when your referral buys solar:</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <p className="text-white font-bold">When they buy solar</p>
                  <span className="text-green-400">₹500</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <p className="text-white font-bold">When installed</p>
                  <span className="text-green-400">₹1,500</span>
                </div>
                <div className="flex items-center justify-between bg-green-600/20 border border-green-500/50 p-3 rounded-lg">
                  <p className="text-white font-bold">Total per customer</p>
                  <span className="text-green-400">₹2,000</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Multi-Level Referrals */}
        <Card className="bg-white/10 border-white/20 p-12 mb-16">
          <div className="flex items-start gap-4">
            <Users className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Unlimited Earning Potential
              </h3>
              <p className="text-gray-300 mb-4">
                Your referrals can also become referrers! When they refer others and those people buy solar, you earn commissions too. Build your network and multiply your earnings indefinitely.
              </p>
              <div className="bg-orange-600/20 border border-orange-500/50 p-4 rounded-lg">
                <p className="text-white font-bold">Example:</p>
                <p className="text-gray-300 text-sm mt-2">
                  You refer Raj (earn ₹500 when he buys solar)
                  <br />
                  Raj refers Priya (you earn ₹20-₹100 from Raj's task)
                  <br />
                  Priya buys solar (you earn commission from Raj's referral)
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Earning?</h2>
          <p className="text-gray-300 mb-8 text-lg">
            Share your unique link and earn ₹500 + ₹1,500 per customer you refer
          </p>
          <Button
            onClick={() => navigate("/referrer-signup")}
            className="bg-orange-600 hover:bg-orange-700 text-white px-12 py-6 text-lg"
          >
            Sign Up as Referrer <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black/40 border-t border-white/10 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>AB SOLAR © 2026. All rights reserved. | Referral Program Terms Apply</p>
        </div>
      </div>
    </div>
  );
}
