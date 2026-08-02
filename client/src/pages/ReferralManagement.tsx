import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ReferralManagement() {
  const [selectedTab, setSelectedTab] = useState<"links" | "referrers" | "referrals" | "withdrawals">("links");
  const [confirmDeleteReferrerId, setConfirmDeleteReferrerId] = useState<number | null>(null);

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
    onSuccess: () => { withdrawals.refetch(); },
  });
  const rejectWithdrawal = trpc.referrer.rejectWithdrawal.useMutation({
    onSuccess: () => { withdrawals.refetch(); },
  });
  const deleteReferrer = trpc.referrer.deleteReferrer.useMutation({
    onSuccess: () => {
      referrers.refetch();
      setConfirmDeleteReferrerId(null);
      toast.success("Referrer deleted");
    },
    onError: () => toast.error("Failed to delete referrer"),
  });

  const potInfo = trpc.referrer.getPotInfo.useQuery(undefined, { refetchInterval: 15000 });
  const setPotBalance = trpc.referrer.setPotBalance.useMutation({ onSuccess: () => potInfo.refetch() });
  const [newBalance, setNewBalance] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Referral Management</h1>
        <p className="text-gray-400">Manage referrers, track referrals, and approve withdrawals</p>
      </div>

      {/* Confirm delete referrer dialog */}
      {confirmDeleteReferrerId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Referrer?</h3>
            <p className="text-muted-foreground text-sm mb-4">This will permanently delete the referrer and all their referrals, tasks, and withdrawal history. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteReferrerId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteReferrer.mutate({ id: confirmDeleteReferrerId! })} disabled={deleteReferrer.isPending}>
                {deleteReferrer.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Reward Pool Card */}
      <div style={{ background: "#141414", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14, padding: "20px 24px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💰</div>
          <div>
            <p style={{ margin: 0, color: "#555", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Reward Pool Balance</p>
            <p style={{ margin: "4px 0 0", color: "#10b981", fontSize: 32, fontWeight: 800 }}>₹{(potInfo.data?.balance ?? 10000).toLocaleString("en-IN")}</p>
            <div style={{ marginTop: 6, height: 4, background: "#222", borderRadius: 4, overflow: "hidden", width: 200 }}>
              <div style={{ height: "100%", background: "#10b981", borderRadius: 4, width: `${Math.min(100, ((potInfo.data?.balance ?? 10000) / 10000) * 100)}%`, transition: "width 0.5s" }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            placeholder="Set new balance (e.g. 10000)"
            value={newBalance}
            onChange={e => setNewBalance(e.target.value)}
            style={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 14, width: 220 }}
          />
          <button
            onClick={() => { if (newBalance) { setPotBalance.mutate({ amount: Number(newBalance) }); setNewBalance(""); } }}
            disabled={setPotBalance.isPending || !newBalance}
            style={{ background: "#10b981", color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", opacity: setPotBalance.isPending ? 0.6 : 1 }}
          >
            {setPotBalance.isPending ? "Updating..." : "Update Pool"}
          </button>
        </div>
      </div>

      {/* Links Tab */}
      {selectedTab === "links" && (
        <div className="space-y-4">
          {/* Referrer Recruitment Video */}
          <Card className="bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-lg">🎬</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Referrer Recruitment Video</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Share this video to recruit new referrers — ₹50 bonus on signup</p>
                  <p className="text-xs text-green-500 font-mono mt-1 truncate">{window.location.origin}/product-guide</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${window.location.origin}/product-guide`)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.open(`/product-guide`, "_blank")}>
                    View
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => { const msg = encodeURIComponent(`💰 *Earn ₹1,500 per Solar Installation!*\n\nAgent Klaus does all the work. You just share your link and earn.\n\n🎬 Demo Video:\nhttps://files.manuscdn.com/user_upload_by_module/session_file/310519663486128902/QdycXBdVpQteWfXP.mp4\n\n🔗 Sign Up & Get Your Code:\n${window.location.origin}/referrer-signup\n\n✅ ₹50 bonus on signup\n✅ No selling needed\n✅ Earn ₹1,500 per installation`); window.open(`https://wa.me/?text=${msg}`, "_blank"); }}>
                    📱 Share
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Chatbot Link + Referral Link */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <span className="text-white text-base">⚡</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Chatbot Link</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{window.location.origin}/chat/demo</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${window.location.origin}/chat/demo`)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Share with customers to start a solar quote conversation</p>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-base">🎁</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Referral Link</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{window.location.origin}/referral-landing</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`${window.location.origin}/referral-landing`)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Landing page for referrers to sign up and get their unique code</p>
              </div>
            </Card>
          </div>

          {/* Existing links */}
          <Card className="bg-white/10 border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">More Share Links</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Referrer Signup Link</label>
                <div className="flex gap-2">
                  <Input value={`${window.location.origin}/referrer-signup`} readOnly className="bg-white/5 border-white/20 text-white" />
                  <Button onClick={() => copyToClipboard(`${window.location.origin}/referrer-signup`)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Send this to people who want to be referrers</p>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Customer Chatbot Link</label>
                <div className="flex gap-2">
                  <Input value={`${window.location.origin}/chat/demo`} readOnly className="bg-white/5 border-white/20 text-white" />
                  <Button onClick={() => copyToClipboard(`${window.location.origin}/chat/demo`)} className="bg-emerald-600 hover:bg-emerald-700">
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
                  <div className="flex items-start gap-3">
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
                    <button
                      onClick={() => setConfirmDeleteReferrerId(ref.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors mt-1"
                      title="Delete referrer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                      {(ref.signupBonusPaid || ref.subsidyApplied) && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">₹500 paid</span>
                      )}
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
                      <Button size="sm" onClick={() => markSubsidy.mutate({ referralId: ref.id })} disabled={markSubsidy.isPending} className="bg-orange-500 hover:bg-orange-600 text-xs h-8">
                        Mark Subsidy Applied (+₹500)
                      </Button>
                    )}
                    {ref.subsidyApplied && ref.status !== "completed" && (
                      <Button size="sm" onClick={() => confirmInstall.mutate({ referralId: ref.id })} disabled={confirmInstall.isPending} className="bg-green-600 hover:bg-green-700 text-xs h-8">
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
                    <Button onClick={() => approveWithdrawal.mutate({ withdrawalId: wd.id })} disabled={approveWithdrawal.isPending} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => rejectWithdrawal.mutate({ withdrawalId: wd.id })} disabled={rejectWithdrawal.isPending} className="bg-red-600 hover:bg-red-700">
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
