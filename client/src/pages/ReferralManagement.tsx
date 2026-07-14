import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ReferralManagement() {
  const [selectedTab, setSelectedTab] = useState<"links" | "referrers" | "referrals" | "withdrawals">("links");

  // Queries
  const referrers = trpc.referrer.getAllReferrers.useQuery();
  const referrals = trpc.referrer.getAllReferrals.useQuery();
  const withdrawals = trpc.referrer.getPendingWithdrawals.useQuery();

  // Mutations
  const markSubsidy = trpc.referrer.markSubsidyApplied.useMutation({
    onSuccess: () => { referrals.refetch(); },
  });

  const confirmInstall = trpc.referrer.confirmInstallation.useMutation({
    onSuccess: () => { referrals.refetch(); },
  });

  const approveWithdrawal = trpc.referrer.approveWithdrawal.useMutation({
    onSuccess: () => {
      withdrawals.refetch();
    },
  });

  const rejectWithdrawal = trpc.referrer.rejectWithdrawal.useMutation({
    onSuccess: () => {
      withdrawals.refetch();
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Referral Management</h1>
        <p className="text-gray-400">Manage referrers, track referrals, and approve withdrawals</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {["links", "referrers", "referrals", "withdrawals"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab as any)}
            className={`px-4 py-3 font-medium transition-colors ${
              selectedTab === tab
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Links Tab */}
      {selectedTab === "links" && (
        <div className="space-y-4">
          <Card className="bg-white/10 border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Share These Links</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Referrer Signup Link</label>
                <div className="flex gap-2">
                  <Input
                    value="absolarleads-xxxqwsn9.manus.space/referrer-signup"
                    readOnly
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <Button
                    onClick={() => copyToClipboard("absolarleads-xxxqwsn9.manus.space/referrer-signup")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Send this to people who want to be referrers</p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Customer Chatbot Link</label>
                <div className="flex gap-2">
                  <Input
                    value="absolarleads-xxxqwsn9.manus.space/chat/ab-solar"
                    readOnly
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <Button
                    onClick={() => copyToClipboard("absolarleads-xxxqwsn9.manus.space/chat/ab-solar")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Regular chatbot link for customers</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Referrers Tab */}
      {selectedTab === "referrers" && (
        <div className="space-y-4">
          {referrers.isLoading ? (
            <p className="text-gray-400">Loading referrers...</p>
          ) : referrers.data && referrers.data.length > 0 ? (
            referrers.data.map((ref: any) => (
              <Card key={ref.id} className="bg-white/10 border-white/20 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-bold">{ref.name}</h3>
                    <p className="text-sm text-gray-400">{ref.email}</p>
                    <p className="text-sm text-gray-400">{ref.totalReferrals} referrals • Code: {ref.uniqueCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-400">₹{Number(ref.totalEarnings).toLocaleString()}</p>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        Number(ref.qualityScore ?? 100) >= 80 ? 'bg-green-500/20 text-green-400' :
                        Number(ref.qualityScore ?? 100) >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>Quality: {ref.qualityScore ?? 100}%</span>
                      {Number(ref.dailyStreak || 0) > 0 && <span className="text-xs text-orange-400">🔥{ref.dailyStreak}d</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-gray-400">No referrers yet</p>
          )}
        </div>
      )}

      {/* Referrals Tab */}
      {selectedTab === "referrals" && (
        <div className="space-y-4">
          {referrals.isLoading ? (
            <p className="text-gray-400">Loading referrals...</p>
          ) : referrals.data && referrals.data.length > 0 ? (
            referrals.data.map((ref: any) => (
              <Card key={ref.id} className="bg-white/10 border-white/20 p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold">{ref.customerName}</h3>
                      {ref.customerVerified ? (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">✅ Verified</span>
                      ) : (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">⏳ Unverified</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">Referred by: <span className="text-emerald-400">{ref.referrerName}</span></p>
                    <p className="text-sm text-gray-400">{ref.customerPhone} • {ref.customerEmail}</p>
                    {ref.monthlyBill && <p className="text-sm text-gray-400">Bill: ₹{ref.monthlyBill}/mo • {ref.state}</p>}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {ref.signupBonusPaid ? (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">₹500 paid</span>
                      ) : ref.subsidyApplied ? (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">₹500 paid</span>
                      ) : null}
                      {ref.installationBonusPaid && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">₹1,500 paid</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end shrink-0">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      ref.status === "completed" ? "bg-green-500/20 text-green-400" :
                      ref.status === "subsidy_applied" ? "bg-orange-500/20 text-orange-400" :
                      ref.customerVerified ? "bg-blue-500/20 text-blue-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {ref.status === "completed" ? "✅ Installed" :
                       ref.status === "subsidy_applied" ? "📋 Subsidy Applied" :
                       ref.customerVerified ? "✅ Verified" : "⏳ Pending"}
                    </div>
                    {!ref.subsidyApplied && ref.customerVerified && (
                      <Button
                        size="sm"
                        onClick={() => markSubsidy.mutate({ referralId: ref.id })}
                        disabled={markSubsidy.isPending}
                        className="bg-orange-500 hover:bg-orange-600 text-xs h-8"
                      >
                        Mark Subsidy Applied (+₹500)
                      </Button>
                    )}
                    {ref.subsidyApplied && ref.status !== "completed" && (
                      <Button
                        size="sm"
                        onClick={() => confirmInstall.mutate({ referralId: ref.id })}
                        disabled={confirmInstall.isPending}
                        className="bg-green-600 hover:bg-green-700 text-xs h-8"
                      >
                        Confirm Installation (+₹1,500)
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-gray-400">No referrals yet</p>
          )}
        </div>
      )}

      {/* Withdrawals Tab */}
      {selectedTab === "withdrawals" && (
        <div className="space-y-4">
          {withdrawals.isLoading ? (
            <p className="text-gray-400">Loading withdrawal requests...</p>
          ) : withdrawals.data && withdrawals.data.length > 0 ? (
            withdrawals.data.map((wd: any) => (
              <Card key={wd.id} className="bg-white/10 border-white/20 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-bold">{wd.referrerName}</h3>
                    <p className="text-sm text-gray-400">{wd.referrerPhone}</p>
                    <p className="text-sm text-gray-400">UPI: {wd.upiId}</p>
                    <p className="text-lg font-bold text-emerald-400 mt-2">₹{wd.amount}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveWithdrawal.mutate({ withdrawalId: wd.id })}
                      disabled={approveWithdrawal.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => rejectWithdrawal.mutate({ withdrawalId: wd.id })}
                      disabled={rejectWithdrawal.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-gray-400">No pending withdrawal requests</p>
          )}
        </div>
      )}
    </div>
  );
}
