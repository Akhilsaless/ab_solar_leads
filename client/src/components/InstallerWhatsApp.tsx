import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const empty = {
  accessToken: "",
  phoneNumberId: "",
  businessAccountId: "",
  graphVersion: "",
  appSecret: "",
  verifyToken: "",
  templateName: "",
  language: "en",
};
export default function InstallerWhatsApp({ token }: { token?: string }) {
  const query = trpc.agencyWhatsApp.status.useQuery(
    { token },
    { retry: false }
  );
  const [editing, setEditing] = useState(false),
    [policy, setPolicy] = useState(false),
    [form, setForm] = useState(empty);
  const refresh = () => {
    void query.refetch();
  };
  const save = trpc.agencyWhatsApp.configure.useMutation({
    onSuccess: () => {
      setForm(empty);
      setEditing(false);
      refresh();
      toast.success(
        "Configuration encrypted and saved. Sending remains disabled."
      );
    },
    onError: e => toast.error(e.message),
  });
  const verify = trpc.agencyWhatsApp.verify.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Sender and approved template verified.");
    },
    onError: e => toast.error(e.message),
  });
  const enable = trpc.agencyWhatsApp.enable.useMutation({
    onSuccess: refresh,
    onError: e => toast.error(e.message),
  });
  const queue = trpc.agencyWhatsApp.queueLeadUpdate.useMutation({
    onSuccess: d => {
      refresh();
      toast.success(
        d.queued
          ? "Update queued for verified delivery."
          : "No message queued: check consent, verification or duplicate status."
      );
    },
    onError: e => toast.error(e.message),
  });
  const [lead, setLead] = useState("");
  if (query.isLoading) return <p role="status">Loading WhatsApp connection…</p>;
  if (query.error)
    return (
      <p role="alert">WhatsApp setup unavailable: {query.error.message}</p>
    );
  return (
    <section className="rounded-xl border p-4 space-y-3">
      <h2 className="text-lg font-semibold">
        Your WhatsApp Business connection
      </h2>
      <p className="text-sm text-muted-foreground">
        This connection belongs to your workspace. Installer and platform
        accounts stay separate. Credentials are encrypted and never returned to
        the browser.
      </p>
      <p>
        {query.data?.configured ? "Configured" : "Not configured"} ·{" "}
        {query.data?.enabled ? "Enabled" : "Sending disabled"}
      </p>
      <p className="text-sm">
        Sender/template:{" "}
        {query.data?.templateVerifiedAt ? "Verified" : "Needs verification"} ·
        Webhook:{" "}
        {query.data?.webhookVerifiedAt ? "Verified" : "Needs verification"}
      </p>
      <label className="block text-sm">
        Meta webhook callback URL
        <Input readOnly value={query.data?.webhookUrl || ""} />
      </label>
      <Button variant="outline" onClick={() => setEditing(!editing)}>
        {editing ? "Close configuration" : "Configure or replace connection"}
      </Button>
      {editing && (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={e => {
            e.preventDefault();
            save.mutate({ token, ...form });
          }}
        >
          {(Object.keys(empty) as Array<keyof typeof empty>).map(key => (
            <label key={key} className="text-sm">
              {
                {
                  accessToken: "Access token",
                  phoneNumberId: "Phone number ID",
                  businessAccountId: "Business account ID",
                  graphVersion: "Supported Graph API version (e.g. vXX.0)",
                  appSecret: "Meta app secret",
                  verifyToken: "Webhook verify token (24+ characters)",
                  templateName: "Approved template name",
                  language: "Template language code",
                }[key]
              }
              <Input
                required
                autoComplete="off"
                type={
                  ["accessToken", "appSecret", "verifyToken"].includes(key)
                    ? "password"
                    : "text"
                }
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Template body must have exactly two variables: customer name and
            lead stage. Configure webhook subscriptions in Meta, then verify
            here.
          </p>
          <Button type="submit" disabled={save.isPending}>
            Save encrypted configuration
          </Button>
        </form>
      )}
      {query.data?.configured && (
        <div className="space-y-2">
          <Button
            variant="outline"
            disabled={verify.isPending}
            onClick={() => verify.mutate({ token })}
          >
            Verify sender and template
          </Button>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={policy}
              onChange={e => setPolicy(e.target.checked)}
            />
            I have configured the approved template, customer consent, opt-out
            handling and a human escalation path.
          </label>
          <Button
            disabled={enable.isPending || (!query.data.enabled && !policy)}
            onClick={() =>
              enable.mutate({
                token,
                enabled: !query.data?.enabled,
                policyConfirmed: policy,
              })
            }
          >
            {query.data.enabled
              ? "Disable sending"
              : "Enable after verification"}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        The platform emergency stop overrides enabled connections. Queued
        messages require the delivery worker. A provider acceptance is shown
        separately from delivery or reading.
      </p>
      {query.data?.enabled && (
        <div className="flex flex-wrap gap-2">
          <label className="text-sm">
            Assigned lead ID
            <Input
              type="number"
              min="1"
              value={lead}
              onChange={e => setLead(e.target.value)}
            />
          </label>
          <Button
            disabled={queue.isPending || !(Number(lead) > 0)}
            onClick={() => queue.mutate({ token, leadId: Number(lead) })}
          >
            Queue lead status update
          </Button>
        </div>
      )}
      <ul className="space-y-2 text-sm">
        {query.data?.messages.map(m => (
          <li key={m.id} className="rounded border p-2">
            <p>
              Lead #{m.leadId} · {m.direction} · {m.status}
              {m.lastError ? ` · ${m.lastError}` : ""}
            </p>
            {m.direction === "inbound" && (
              <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
            )}
          </li>
        ))}
      </ul>
      <Button size="sm" variant="outline" onClick={refresh}>
        Refresh connection status
      </Button>
    </section>
  );
}
