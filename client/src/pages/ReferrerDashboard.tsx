import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, TrendingUp, Users, Award, Wallet } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSearchParams } from "wouter";

export default function ReferrerDashboard() {
  const [searchParams] = useSearchParams();
  const uniqueCode = searchParams.get("code") || "";
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [upiId, setUpiId] = useState("");

  const dashboard = trpc.referrer.getDashboard.useQuery(
    { uniqueCode },
    { enabled: !!uniqueCode }
  );

  const leaderboard = trpc.referrer.getLeaderboard.useQuery();

  const requestWithdrawal = trpc.referrer.requestWithdrawal.useMutation({
    onSuccess: () => {
      setWithdrawAmount("");
      setUpiId("");
      alert("Withdrawal request submitted!");
    },
  });

  if (!uniqueCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 border-white/20">
          <div className="p-8 text-center">
            <p className="text-white">Invalid access. Please use your referral link.</p>
          </div>
        </Card>
      </div>
    );
  }

  const data = dashboard.data;
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  const referrer = data.referrer;
  const tasks = data.tasks || [];
  const referrals = data.referrals || [];
  const currentTask = tasks[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Referral Dashboard</h1>
          <p className="text-gray-300">Welcome, {referrer.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Earnings</p>
                <p className="text-3xl font-bold text-orange-400">₹{referrer.totalEarnings}</p>
              </div>
              <Wallet className="w-10 h-10 text-orange-500" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Referrals</p>
                <p className="text-3xl font-bold text-blue-400">{referrer.totalReferrals}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Current Task</p>
                <p className="text-3xl font-bold text-green-400">Task {(currentTask as any)?.taskNumber || 1}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Status</p>
                <p className="text-3xl font-bold text-purple-400">Active</p>
              </div>
              <Award className="w-10 h-10 text-purple-500" />
            </div>
          </Card>
        </div>

        {/* Referral Link */}
        <Card className="bg-white/10 border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Your Referral Link</h2>
          <div className="flex gap-2">
            <Input
              value={`absolarleads-xxxqwsn9.manus.space/refer/${uniqueCode}`}
              readOnly
              className="bg-white/5 border-white/20 text-white"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(
                  `absolarleads-xxxqwsn9.manus.space/refer/${uniqueCode}`
                );
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Current Task */}
        {currentTask && (
          <Card className="bg-white/10 border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Task {(currentTask as any).taskNumber}</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Progress</span>
                  <span className="text-white font-bold">
                    {(currentTask as any).completedReferrals}/{(currentTask as any).targetReferrals}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                    style={{
                      width: `${((currentTask as any).completedReferrals / (currentTask as any).targetReferrals) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="text-gray-300">
                Earn ₹{(currentTask as any).bonusPerReferral} per referral (₹{(currentTask as any).totalBonus} total for this task)
              </p>
            </div>
          </Card>
        )}

        {/* Withdrawal Request */}
        <Card className="bg-white/10 border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Request Withdrawal</h2>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Amount (₹)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
            />
            <Input
              placeholder="UPI ID (e.g., yourname@upi)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
            />
            <Button
              onClick={() => {
                if (!withdrawAmount || !upiId) {
                  alert("Please fill all fields");
                  return;
                }
                requestWithdrawal.mutate({
                  uniqueCode,
                  amount: parseFloat(withdrawAmount),
                  upiId,
                });
              }}
              disabled={requestWithdrawal.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Request Withdrawal
            </Button>
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="bg-white/10 border-white/20 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Top Referrers</h2>
          <div className="space-y-3">
            {leaderboard.data?.map((ref: any, idx: number) => (
              <div key={ref.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-orange-500">#{idx + 1}</span>
                  <span className="text-white">{ref.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold">₹{ref.totalEarnings}</p>
                  <p className="text-gray-400 text-sm">{ref.totalReferrals} referrals</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
