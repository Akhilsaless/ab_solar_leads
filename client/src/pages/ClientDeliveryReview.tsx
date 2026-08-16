import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ClipboardCheck, MapPin, Phone, XCircle } from "lucide-react";
import { toast } from "sonner";

const REASONS = ["wrong_geography", "wrong_requirement", "invalid_contact", "duplicate", "not_interested", "already_purchased", "incorrect_qualification", "appointment_invalid", "no_show", "client_specific"];

export default function ClientDeliveryReview() {
  const [, params] = useRoute("/client/review/:token");
  const token = params?.token || "";
  const review = trpc.campaignIntelligence.getClientDeliveryReview.useQuery({ token }, { enabled: token.length >= 40, retry: false });
  const [outcome, setOutcome] = useState<"accepted" | "rejected">("accepted");
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const submit = trpc.campaignIntelligence.submitClientDeliveryDecision.useMutation({ onSuccess: () => { review.refetch(); toast.success("Your decision has been recorded."); }, onError: (error) => toast.error(error.message) });
  if (review.isLoading) return <Screen><div className="h-64 animate-pulse rounded-xl bg-muted" /></Screen>;
  if (review.error || !review.data) return <Screen><Card><CardContent className="p-10 text-center"><XCircle className="mx-auto mb-3 h-9 w-9 text-destructive" /><p className="font-semibold">Review link unavailable</p><p className="mt-1 text-sm text-muted-foreground">This link may have expired, been revoked, or already been replaced.</p></CardContent></Card></Screen>;
  const data: any = review.data;
  const final = data.deliveryStatus !== "pending";
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || data.company || "Delivered lead";
  return <Screen><Card><CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Sales Squad lead review</p><CardTitle className="mt-1">Review delivered lead</CardTitle></div><Badge variant={final ? (data.deliveryStatus === "accepted" ? "default" : "destructive") : "secondary"}>{data.deliveryStatus}</Badge></div></CardHeader><CardContent className="space-y-6"><div className="rounded-xl bg-muted/50 p-4"><p className="font-semibold">{name}</p><p className="mt-1 text-sm text-muted-foreground">Campaign: {data.campaignName}</p>{data.company && <p className="text-sm text-muted-foreground">Company: {data.company}</p>}<div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{data.phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />{data.phone}</span>}{(data.city || data.state) && <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{[data.city, data.state].filter(Boolean).join(", ")}</span>}</div></div>{final ? <div className="rounded-xl border p-4"><p className="font-medium">Decision already recorded</p><p className="mt-1 text-sm text-muted-foreground">{data.deliveryStatus === "accepted" ? "This lead was accepted." : `This lead was rejected: ${String(data.rejectionReason || "not specified").replaceAll("_", " ")}`}</p></div> : <div className="space-y-4"><div><label className="mb-2 block text-sm font-medium">Decision</label><div className="grid grid-cols-2 gap-2"><Button variant={outcome === "accepted" ? "default" : "outline"} onClick={() => setOutcome("accepted")}><CheckCircle2 className="mr-2 h-4 w-4" />Accept</Button><Button variant={outcome === "rejected" ? "destructive" : "outline"} onClick={() => setOutcome("rejected")}><XCircle className="mr-2 h-4 w-4" />Reject</Button></div></div>{outcome === "rejected" && <div><label className="mb-1.5 block text-sm font-medium">Reason</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={reason} onChange={(event) => setReason(event.target.value)}>{REASONS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></div>}<div><label className="mb-1.5 block text-sm font-medium">Note (optional)</label><textarea className="min-h-24 w-full rounded-md border bg-background p-3 text-sm" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add relevant qualification or rejection detail" /></div><Button className="w-full" disabled={submit.isPending} onClick={() => submit.mutate({ token, outcome, ...(outcome === "rejected" ? { rejectionReason: reason as any } : {}), ...(note ? { note } : {}) })}>{submit.isPending ? "Saving..." : outcome === "accepted" ? "Confirm acceptance" : "Confirm rejection"}</Button></div>}</CardContent></Card></Screen>;
}

function Screen({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-background px-4 py-10 text-foreground"><div className="mx-auto max-w-xl">{children}</div></main>; }
