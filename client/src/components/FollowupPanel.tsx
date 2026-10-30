import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
const defaults = {
  orgId: "",
  workspaceId: "",
  appId: "",
  appVersion: 1,
  connectionId: "",
  agentPhone: "+910000000000",
  maxCallSeconds: 180,
  callRatePaise: 800,
  billPricePaise: 200,
  messagePricePaise: 150,
  maxAttempts: 2,
  minimumBill: 2000,
  servicePincodes: [] as string[],
  routingPartnerIds: [] as number[],
  automaticRouting: false,
  metaPageId: "",
  metaConsentField: "callback_consent",
  metaConsentText: "",
  graphVersion: "v24.0",
  automaticCalls: false,
  providerDurationConfirmed: false,
  consentPolicyConfirmed: false,
};
const parsed = (value: any) => {
  if (typeof value !== "string") return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};
const money = (paise: number) => `₹${(Number(paise) / 100).toFixed(2)}`;
export default function FollowupPanel({ owner }: { owner: boolean }) {
  const query = trpc.followup.dashboard.useQuery(undefined, { retry: false });
  const [form, setForm] = useState(defaults);
  const [limit, setLimit] = useState(0);
  const [secrets, setSecrets] = useState({
    voiceKey: "",
    documentKey: "",
    intakeToken: "",
    voiceToolToken: "",
    metaAppSecret: "",
    metaPageToken: "",
    metaVerifyToken: "",
  });
  const [leadId, setLeadId] = useState("");
  const [credit, setCredit] = useState({
    agencyId: "",
    amount: "",
    reference: "",
  });
  const [review, setReview] = useState({ id: "", amount: "", evidence: "" });
  const [bill, setBill] = useState({
    id: "",
    amount: "",
    units: "",
    consumer: "",
    load: "",
    discom: "",
  });
  useEffect(() => {
    if (query.data) {
      setForm({ ...defaults, ...query.data.config });
      setLimit(Number(query.data.monthlyLimitPaise));
    }
  }, [query.data]);
  const success = () => {
    query.refetch();
  };
  const failure = (error: { message: string }) => toast.error(error.message);
  const save = trpc.followup.save.useMutation({
    onSuccess: () => {
      setSecrets({
        voiceKey: "",
        documentKey: "",
        intakeToken: "",
        voiceToolToken: "",
        metaAppSecret: "",
        metaPageToken: "",
        metaVerifyToken: "",
      });
      toast.success(
        "Configuration saved. Add-on is paused until you enable it."
      );
      success();
    },
    onError: failure,
  });
  const enabled = trpc.followup.setEnabled.useMutation({
    onSuccess: success,
    onError: failure,
  });
  const queue = trpc.followup.queueCall.useMutation({
    onSuccess: result => {
      toast.success(
        result.queued
          ? "Call queued within your limits."
          : "No call queued. Check add-on readiness."
      );
      success();
    },
    onError: failure,
  });
  const retryMeta = trpc.followup.retryMeta.useMutation({
    onSuccess: success,
    onError: failure,
  });
  const recording = trpc.followup.recording.useMutation({ onError: failure });
  const cancel = trpc.followup.cancel.useMutation({
    onSuccess: success,
    onError: failure,
  });
  const addCredit = trpc.followup.credit.useMutation({
    onSuccess: () => {
      toast.success("Reconciled payment credited.");
      success();
    },
    onError: failure,
  });
  const reconcile = trpc.followup.reconcile.useMutation({
    onSuccess: success,
    onError: failure,
  });
  const confirm = trpc.followup.confirmBill.useMutation({
    onSuccess: () => {
      toast.success("Bill data confirmed.");
      setBill({
        id: "",
        amount: "",
        units: "",
        consumer: "",
        load: "",
        discom: "",
      });
      success();
    },
    onError: failure,
  });
  const input = (
    label: string,
    value: string,
    change: (value: string) => void,
    type = "text"
  ) => (
    <label className="block text-sm">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
        type={type}
        autoComplete={type === "password" ? "new-password" : "off"}
        value={value}
        onChange={event => change(event.target.value)}
      />
    </label>
  );
  if (query.isLoading)
    return (
      <Card>
        <CardContent className="p-4">Loading AI Follow-up…</CardContent>
      </Card>
    );
  if (query.error)
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Follow-up add-on</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Setup is unavailable. The release migration and database connection
            must be checked before activation.
          </p>
          <Button onClick={() => query.refetch()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  const data = query.data!;
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Follow-up add-on</CardTitle>
        <p className="text-sm text-muted-foreground">
          Optional paid calls and bill follow-up. Core lead capture stays
          available while this add-on is paused.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p>
            Status: <strong>{data.enabled ? "Enabled" : "Paused"}</strong>
          </p>
          <p>
            Prepaid balance: <strong>{money(data.balancePaise)}</strong>
          </p>
          <p>
            Monthly usage and reservations: {money(data.monthReservedPaise)}
          </p>
          <p>Monthly limit: {money(data.monthlyLimitPaise)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => query.refetch()}>
            Refresh status
          </Button>
          <Button
            disabled={enabled.isPending}
            variant={data.enabled ? "outline" : "default"}
            onClick={() => enabled.mutate({ enabled: !data.enabled })}
          >
            {data.enabled ? "Pause add-on" : "Enable configured add-on"}
          </Button>
        </div>
        <details>
          <summary className="cursor-pointer font-medium">
            Provider connections and usage controls
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Leave keys empty for now, or leave them empty to retain saved
              keys. Saving changes pauses the add-on. Voice uses a Sarvam
              workspace key; bill extraction can reuse the Sarvam key in AI
              Providers.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {input(
                `Sarvam voice workspace key ${data.voiceKeyConfigured ? "(saved)" : "(optional)"}`,
                secrets.voiceKey,
                value => setSecrets({ ...secrets, voiceKey: value }),
                "password"
              )}
              {input(
                `Sarvam document key ${data.documentKeyConfigured ? "(saved)" : "(optional override)"}`,
                secrets.documentKey,
                value => setSecrets({ ...secrets, documentKey: value }),
                "password"
              )}
              {input(
                "Voice booking tool access token (optional, 32+ characters)",
                secrets.voiceToolToken,
                value => setSecrets({ ...secrets, voiceToolToken: value }),
                "password"
              )}
              {input(
                "Meta app secret (optional)",
                secrets.metaAppSecret,
                value => setSecrets({ ...secrets, metaAppSecret: value }),
                "password"
              )}
              {input(
                "Meta Page access token (optional)",
                secrets.metaPageToken,
                value => setSecrets({ ...secrets, metaPageToken: value }),
                "password"
              )}
              {input(
                "Meta webhook verification token (32+ characters)",
                secrets.metaVerifyToken,
                value => setSecrets({ ...secrets, metaVerifyToken: value }),
                "password"
              )}
              {input("Meta Page ID", form.metaPageId, value =>
                setForm({ ...form, metaPageId: value })
              )}
              {input(
                "Meta Graph API version supported by your app",
                form.graphVersion,
                value => setForm({ ...form, graphVersion: value })
              )}
              {input(
                "Callback consent question field name",
                form.metaConsentField,
                value => setForm({ ...form, metaConsentField: value })
              )}
              {input(
                "Consent disclosure shown on your lead form",
                form.metaConsentText,
                value => setForm({ ...form, metaConsentText: value })
              )}
              {input(
                "Approved routing partner IDs, in priority order",
                form.routingPartnerIds.join(","),
                value =>
                  setForm({
                    ...form,
                    routingPartnerIds: value
                      .split(",")
                      .filter(Boolean)
                      .map(Number),
                  })
              )}
              {input(
                `Lead intake access token ${data.intakeConfigured ? "(saved)" : "(32+ characters)"}`,
                secrets.intakeToken,
                value => setSecrets({ ...secrets, intakeToken: value }),
                "password"
              )}
              {(
                [
                  "orgId",
                  "workspaceId",
                  "appId",
                  "connectionId",
                  "agentPhone",
                ] as const
              ).map(key => (
                <div key={key}>
                  {input(
                    {
                      orgId: "Sarvam organisation ID",
                      workspaceId: "Workspace ID",
                      appId: "Published voice agent ID",
                      connectionId: "Telephony connection ID",
                      agentPhone: "Verified calling number (+91)",
                    }[key],
                    String(form[key]),
                    value => setForm({ ...form, [key]: value })
                  )}
                </div>
              ))}
              {(
                [
                  "appVersion",
                  "maxCallSeconds",
                  "callRatePaise",
                  "billPricePaise",
                  "messagePricePaise",
                  "maxAttempts",
                  "minimumBill",
                ] as const
              ).map(key => (
                <div key={key}>
                  {input(
                    {
                      appVersion: "Published agent version",
                      maxCallSeconds: "Maximum call seconds",
                      callRatePaise:
                        "Customer charge per started call minute (paise)",
                      billPricePaise: "Customer bill-extraction charge (paise)",
                      messagePricePaise: "Customer message charge (paise)",
                      maxAttempts: "Maximum call attempts per lead",
                      minimumBill: "Minimum monthly bill (₹)",
                    }[key],
                    String(form[key]),
                    value => setForm({ ...form, [key]: Number(value) }),
                    "number"
                  )}
                </div>
              ))}
              {input(
                "Monthly prepaid usage limit (₹)",
                String(limit / 100),
                value => setLimit(Math.round(Number(value) * 100)),
                "number"
              )}
              {input(
                "Service pincodes (comma separated)",
                form.servicePincodes.join(","),
                value =>
                  setForm({
                    ...form,
                    servicePincodes: value.split(",").map(x => x.trim()),
                  })
              )}
            </div>
            <p className="break-all text-xs text-muted-foreground">
              Lead intake address: {data.intakeUrl}
            </p>
            {(
              [
                "automaticCalls",
                "automaticRouting",
                "providerDurationConfirmed",
                "consentPolicyConfirmed",
              ] as const
            ).map(key => (
              <label key={key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={event =>
                    setForm({ ...form, [key]: event.target.checked })
                  }
                />
                <span>
                  {
                    {
                      automaticCalls:
                        "Queue calls automatically for newly consented leads",
                      automaticRouting:
                        "Route qualified enquiries to the approved installers above; installer acceptance remains separate",
                      providerDurationConfirmed:
                        "I configured this maximum call length in the published Sarvam agent and checked the calling number",
                      consentPolicyConfirmed:
                        "I verified callback consent, calling permissions, disclosure and opt-out handling",
                    }[key]
                  }
                </span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              The wallet reserves the maximum configured customer charge before
              work starts. Uncertain provider requests hold their reservation
              for review. Supplier bills are separate from customer prices;
              verify your margin and provider limits. Calls are dispatched
              between 09:00 and 20:00 IST.
            </p>
            <Button
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  ...form,
                  servicePincodes: form.servicePincodes.filter(Boolean),
                  monthlyLimitPaise: limit,
                  ...Object.fromEntries(
                    Object.entries(secrets)
                      .filter(([, value]) => value.trim())
                      .map(([key, value]) => [key, value.trim()])
                  ),
                })
              }
            >
              Save encrypted setup
            </Button>
          </div>
        </details>
        <div className="flex flex-wrap items-end gap-2">
          {input("Existing lead ID", leadId, setLeadId, "number")}
          <Button
            disabled={!data.enabled || queue.isPending || !leadId}
            onClick={() => queue.mutate({ leadId: Number(leadId) })}
          >
            Queue qualification call
          </Button>
        </div>
        <div>
          <h3 className="mb-2 font-medium">Recent work and exceptions</h3>
          <div className="max-h-96 overflow-auto space-y-2">
            {!data.jobs.length && (
              <p className="text-sm text-muted-foreground">
                No add-on jobs yet.
              </p>
            )}
            {data.jobs.map((job: any) => (
              <div
                key={job.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <p>
                  #{job.id} · Lead {job.leadId} · {job.kind} ·{" "}
                  <strong>{job.status.replaceAll("_", " ")}</strong>
                </p>
                <p>
                  Reserved {money(job.reservedPaise)} · Charged{" "}
                  {job.chargedPaise == null
                    ? "pending"
                    : money(job.chargedPaise)}
                </p>
                {job.kind === "call" && job.status === "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={recording.isPending}
                    onClick={() => recording.mutate({ id: job.id })}
                  >
                    Load call recording
                  </Button>
                )}
                {recording.data?.id === job.id && (
                  <audio
                    controls
                    preload="none"
                    src={recording.data?.audio}
                    aria-label={`Call recording for lead ${job.leadId}`}
                  />
                )}
                {job.errorCode && (
                  <p className="text-amber-500">
                    {job.errorCode.replaceAll("_", " ")}
                  </p>
                )}
                {job.result && (
                  <details>
                    <summary>View outcome</summary>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(parsed(job.result), null, 2)}
                    </pre>
                  </details>
                )}
                {["queued", "budget_blocked"].includes(job.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancel.mutate({ id: job.id })}
                  >
                    Cancel
                  </Button>
                )}
                {job.status === "needs_confirmation" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const raw = parsed(job.result);
                      const value = raw.result || raw;
                      setBill({
                        id: String(job.id),
                        amount: String(value.amount ?? ""),
                        units: String(value.units ?? ""),
                        consumer: String(value.consumer_number ?? ""),
                        load: String(value.sanctioned_load_kw ?? ""),
                        discom: String(value.discom ?? ""),
                      });
                    }}
                  >
                    Review bill
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        {bill.id && (
          <div className="rounded-xl border border-border p-3 space-y-3">
            <h3 className="font-medium">Confirm bill #{bill.id}</h3>
            <p className="text-xs">
              Compare the extracted data with the customer's bill before saving.
              Blank fields remain unknown.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["amount", "units", "consumer", "load", "discom"] as const).map(
                key => (
                  <div key={key}>
                    {input(
                      {
                        amount: "Period amount (₹)",
                        units: "Period units (kWh)",
                        consumer: "Consumer number",
                        load: "Sanctioned load (kW)",
                        discom: "DISCOM",
                      }[key],
                      bill[key],
                      value => setBill({ ...bill, [key]: value })
                    )}
                  </div>
                )
              )}
            </div>
            <Button
              disabled={confirm.isPending}
              onClick={() =>
                confirm.mutate({
                  id: Number(bill.id),
                  data: {
                    amount: bill.amount ? Number(bill.amount) : null,
                    units: bill.units ? Number(bill.units) : null,
                    consumer_number: bill.consumer || null,
                    sanctioned_load_kw: bill.load ? Number(bill.load) : null,
                    discom: bill.discom || null,
                  },
                })
              }
            >
              Confirm reviewed bill
            </Button>
          </div>
        )}
        {owner && (
          <details>
            <summary className="cursor-pointer font-medium">
              Owner payment and exception reconciliation
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs">
                Credit only a payment you have received and reconciled. This
                records a receipt; it does not move money.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {input(
                  "Agency ID",
                  credit.agencyId,
                  value => setCredit({ ...credit, agencyId: value }),
                  "number"
                )}
                {input(
                  "Received amount (₹)",
                  credit.amount,
                  value => setCredit({ ...credit, amount: value }),
                  "number"
                )}
                {input("Unique payment reference", credit.reference, value =>
                  setCredit({ ...credit, reference: value })
                )}
              </div>
              <Button
                disabled={addCredit.isPending}
                onClick={() =>
                  addCredit.mutate({
                    agencyId: Number(credit.agencyId),
                    amountPaise: Math.round(Number(credit.amount) * 100),
                    paymentReference: credit.reference,
                  })
                }
              >
                Record received payment
              </Button>
              <p className="text-xs">
                Resolve uncertain jobs only after checking the provider
                dashboard. The same job can be settled only once.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {input(
                  "Uncertain job ID",
                  review.id,
                  value => setReview({ ...review, id: value }),
                  "number"
                )}
                {input(
                  "Final customer charge (₹)",
                  review.amount,
                  value => setReview({ ...review, amount: value }),
                  "number"
                )}
                {input("Provider evidence/reference", review.evidence, value =>
                  setReview({ ...review, evidence: value })
                )}
              </div>
              <Button
                disabled={reconcile.isPending}
                onClick={() =>
                  reconcile.mutate({
                    id: Number(review.id),
                    chargedPaise: Math.round(Number(review.amount) * 100),
                    evidence: review.evidence,
                  })
                }
              >
                Reconcile job
              </Button>
            </div>
          </details>
        )}
        <details>
          <summary className="cursor-pointer font-medium">
            Meta lead intake
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            {data.metaInbox.map((entry: any) => (
              <div key={entry.leadgenId}>
                <p>
                  {entry.leadgenId} · {entry.status} · {entry.errorCode || ""}
                </p>
                {entry.status === "needs_human" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={retryMeta.isPending}
                    onClick={() =>
                      retryMeta.mutate({ leadgenId: entry.leadgenId })
                    }
                  >
                    Retry after correcting setup
                  </Button>
                )}
              </div>
            ))}
          </div>
        </details>
        <details>
          <summary className="cursor-pointer font-medium">
            Prepaid statement
          </summary>
          <div className="max-h-60 overflow-auto mt-3 text-sm">
            {data.ledger.map((entry: any) => (
              <p key={entry.id} className="border-b border-border py-2">
                {money(entry.amountPaise)} · {entry.description} ·{" "}
                {new Date(entry.createdAt).toLocaleDateString("en-IN")}
              </p>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
