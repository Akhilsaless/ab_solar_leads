import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { SolarStage } from "@shared/solarWorkflow";
import InstallerWhatsApp from "./InstallerWhatsApp";

const label = (value: string) => value.replaceAll("_", " ");
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(String(value || "[]"));
  } catch {
    return [];
  }
}
const slotLabel = (slot: any) =>
  `${new Date(slot.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · ${slot.city}`;
const field = "rounded border border-border bg-background p-2 text-sm min-w-0";

function LeadProgress({
  token,
  lead,
  slots,
  refresh,
}: {
  token: string;
  lead: any;
  slots: any[];
  refresh: () => void;
}) {
  const [note, setNote] = useState("");
  const [slot, setSlot] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [revenue, setRevenue] = useState("");
  const [reference, setReference] = useState("");
  const advance = trpc.solarOperations.advance.useMutation({
    onSuccess: () => {
      refresh();
      setNote("");
      toast.success("Lead milestone recorded.");
    },
    onError: e => toast.error(e.message),
  });
  const book = trpc.solarOperations.bookSurvey.useMutation({
    onSuccess: () => {
      refresh();
      setSlot("");
      setConfirmed(false);
      toast.success("Survey booked.");
    },
    onError: e => toast.error(e.message),
  });
  const next: Partial<Record<SolarStage, SolarStage>> = {
    assigned: "accepted",
    survey_booked: "survey_completed",
    survey_completed: "proposal_sent",
    proposal_sent: "installed",
    installed: "closed_won",
  };
  const target = next[lead.stage as SolarStage];
  const pending = advance.isPending || book.isPending;
  const move = (stage: SolarStage) =>
    advance.mutate({
      token,
      leadId: lead.leadId,
      version: lead.version,
      stage,
      note,
      ...(stage === "closed_won"
        ? {
            revenuePaise: Math.round(Number(revenue) * 100),
            paymentReference: reference,
          }
        : {}),
    });
  return (
    <section className="rounded-xl border p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-medium">
          {lead.firstName} {lead.lastName} · #{lead.leadId}
        </h3>
        <span className="capitalize text-sm">{label(lead.stage)}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {[lead.city, lead.state].filter(Boolean).join(", ")}
      </p>
      {lead.stage === "accepted" && (
        <div className="space-y-2">
          <label className="block text-sm">
            Survey slot
            <select
              aria-label={`Survey slot for lead ${lead.leadId}`}
              className={`${field} block w-full`}
              value={slot}
              onChange={e => setSlot(e.target.value)}
            >
              <option value="">Choose an available slot</option>
              {slots
                .filter(
                  s =>
                    s.status === "available" &&
                    new Date(s.startsAt).getTime() > Date.now()
                )
                .map(s => (
                  <option key={s.id} value={s.id}>
                    {slotLabel(s)}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
            />
            Customer confirmed this appointment
          </label>
          <Button
            disabled={!slot || !confirmed || pending}
            onClick={() =>
              book.mutate({
                token,
                leadId: lead.leadId,
                version: lead.version,
                slotId: Number(slot),
                customerConfirmed: true,
              })
            }
          >
            Book survey
          </Button>
        </div>
      )}
      {target && (
        <>
          <label className="block text-sm">
            Milestone evidence or reference
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Record what happened and the supporting reference"
            />
          </label>
          {target === "closed_won" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">
                Payment received (₹)
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={revenue}
                  onChange={e => setRevenue(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Payment reference
                <Input
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                />
              </label>
            </div>
          )}
          <Button
            disabled={
              pending ||
              note.trim().length < 3 ||
              (target === "closed_won" &&
                (!(Number(revenue) > 0) || !reference.trim()))
            }
            onClick={() => move(target)}
          >
            {label(target)}
          </Button>
        </>
      )}
      {[
        "assigned",
        "accepted",
        "survey_booked",
        "survey_completed",
        "proposal_sent",
      ].includes(lead.stage) && (
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={`Cancellation reason for lead ${lead.leadId}`}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Reason for rejection or cancellation"
          />
          <Button
            variant="outline"
            disabled={pending || note.trim().length < 3}
            onClick={() => move("cancelled")}
          >
            Cancel
          </Button>
          {lead.stage === "survey_booked" && (
            <Button
              variant="outline"
              disabled={pending || note.trim().length < 3}
              onClick={() => move("accepted")}
            >
              Release slot to reschedule
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export default function PartnerSalesOperations({ token }: { token: string }) {
  const query = trpc.solarOperations.partnerOverview.useQuery(
    { token },
    { retry: false }
  );
  const [cities, setCities] = useState("");
  const [pins, setPins] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [city, setCity] = useState("");
  useEffect(() => {
    const s = query.data?.settings;
    if (s) {
      setCities(list(s.serviceCities).join(", "));
      setPins(list(s.servicePincodes).join(", "));
      setAccepting(Boolean(s.acceptingLeads));
    }
  }, [query.data?.settings]);
  const refresh = () => {
    void query.refetch();
  };
  const save = trpc.solarOperations.saveAvailability.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Service availability saved.");
    },
    onError: e => toast.error(e.message),
  });
  const add = trpc.solarOperations.addSlot.useMutation({
    onSuccess: () => {
      refresh();
      setStart("");
      setEnd("");
      toast.success("Survey slot added.");
    },
    onError: e => toast.error(e.message),
  });
  const cancel = trpc.solarOperations.cancelSlot.useMutation({
    onSuccess: refresh,
    onError: e => toast.error(e.message),
  });
  if (query.isLoading) return <p role="status">Loading sales operations…</p>;
  if (query.error)
    return (
      <div role="alert">
        <p>Sales operations unavailable: {query.error.message}</p>
        <Button variant="outline" onClick={refresh}>
          Retry
        </Button>
      </div>
    );
  const split = (text: string) =>
    text
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  return (
    <div className="space-y-6">
      <InstallerWhatsApp token={token} />
      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Service availability</h2>
        <p className="text-sm text-muted-foreground">
          You supply equipment, pricing, coverage and survey availability.
          Platform commercial terms are agreed separately.
        </p>
        <label className="block text-sm">
          Cities (comma separated)
          <Input value={cities} onChange={e => setCities(e.target.value)} />
        </label>
        <label className="block text-sm">
          PIN codes (comma separated)
          <Input value={pins} onChange={e => setPins(e.target.value)} />
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={accepting}
            onChange={e => setAccepting(e.target.checked)}
          />
          Accept new leads after business setup is complete
        </label>
        <Button
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              token,
              acceptingLeads: accepting,
              cities: split(cities),
              pincodes: split(pins),
            })
          }
        >
          Save availability
        </Button>
        <p className="text-sm">
          Commercial model:{" "}
          {label(query.data?.settings?.commercialModel || "not_agreed")}. Saving
          availability does not activate payments.
        </p>
      </section>
      <section className="rounded-xl border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Survey availability</h2>
        <p className="text-sm text-muted-foreground">
          Enter times in your device's local timezone. Booked slots are
          displayed in India time.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Starts
            <Input
              type="datetime-local"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Ends
            <Input
              type="datetime-local"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </label>
          <label className="text-sm">
            City
            <Input value={city} onChange={e => setCity(e.target.value)} />
          </label>
        </div>
        <Button
          disabled={add.isPending || !start || !end || !city.trim()}
          onClick={() => {
            const a = new Date(start),
              b = new Date(end);
            if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()))
              return;
            add.mutate({
              token,
              startsAt: a.toISOString(),
              endsAt: b.toISOString(),
              city,
            });
          }}
        >
          Add survey slot
        </Button>
        <ul className="space-y-2">
          {query.data?.slots.map(s => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>
                {slotLabel(s)} · {s.status}
              </span>
              {s.status === "available" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate({ token, slotId: s.id })}
                >
                  Remove slot
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <h2 className="text-lg font-semibold">Lead milestones</h2>
      {!query.data?.workflows.length && (
        <p className="text-muted-foreground">
          Assigned leads will appear here. No outcomes have been assumed.
        </p>
      )}
      {query.data?.workflows.map(lead => (
        <LeadProgress
          key={lead.leadId}
          token={token}
          lead={lead}
          slots={query.data?.slots || []}
          refresh={refresh}
        />
      ))}
    </div>
  );
}

function PartnerTerms({
  partner,
  refresh,
}: {
  partner: any;
  refresh: () => void;
}) {
  const [model, setModel] = useState<
    "not_agreed" | "accepted_lead" | "completed_survey" | "installation_percent"
  >(partner.commercialModel || "not_agreed");
  const [rate, setRate] = useState(String(partner.commercialRate ?? ""));
  const [date, setDate] = useState(
    String(partner.termsEffectiveFrom || "").slice(0, 10)
  );
  const [note, setNote] = useState(partner.termsNote || "");
  const save = trpc.solarOperations.saveTerms.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Commercial terms saved.");
    },
    onError: e => toast.error(e.message),
  });
  return (
    <section className="rounded-xl border p-4 space-y-2">
      <h3 className="font-semibold">{partner.companyName}</h3>
      <p className="text-sm">
        Setup: {label(partner.onboardingStatus || "setup_required")} ·{" "}
        {partner.acceptingLeads ? "Accepting leads" : "Not accepting leads"}
      </p>
      <label className="block text-sm">
        Agreed charging model
        <select
          className={`${field} block w-full`}
          value={model}
          onChange={e => setModel(e.target.value as typeof model)}
        >
          <option value="not_agreed">Not agreed — inactive</option>
          <option value="accepted_lead">Per accepted lead (₹)</option>
          <option value="completed_survey">Per completed survey (₹)</option>
          <option value="installation_percent">Installation revenue (%)</option>
        </select>
      </label>
      {model !== "not_agreed" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            Rate
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={e => setRate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Effective from
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </label>
        </div>
      )}
      <label className="block text-sm">
        Agreement reference
        <Input value={note} onChange={e => setNote(e.target.value)} />
      </label>
      <Button
        disabled={
          save.isPending ||
          (model !== "not_agreed" &&
            (!rate || !date || note.trim().length < 10))
        }
        onClick={() =>
          save.mutate({
            partnerId: partner.id,
            model,
            rate: model === "not_agreed" ? null : Number(rate),
            effectiveFrom: date || null,
            note,
          })
        }
      >
        Save terms
      </Button>
    </section>
  );
}
export function OwnerSalesOperations() {
  const query = trpc.solarOperations.ownerOverview.useQuery(undefined, {
    retry: false,
  });
  const [choices, setChoices] = useState<Record<number, string>>({});
  const assign = trpc.solarOperations.assign.useMutation({
    onSuccess: () => {
      void query.refetch();
      toast.success("Lead assigned to installer.");
    },
    onError: e => toast.error(e.message),
  });
  if (query.isLoading)
    return <p role="status">Loading installer operations…</p>;
  if (query.error)
    return (
      <p role="alert">
        Installer operations unavailable: {query.error.message}
      </p>
    );
  return (
    <div className="space-y-5">
      <InstallerWhatsApp />
      <h2 className="text-lg font-semibold">Installer operations</h2>
      <p className="text-sm text-muted-foreground">
        Enquiries can wait for a partner. Assignments require a ready installer
        with matching service coverage. Commercial terms can remain inactive
        until agreed.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {query.data?.partners.map(p => (
          <PartnerTerms
            key={p.id}
            partner={p}
            refresh={() => {
              void query.refetch();
            }}
          />
        ))}
      </div>
      <h2 className="font-semibold">Recorded commercial accruals</h2>
      <p className="text-sm text-muted-foreground">
        Accruals use the terms active when the milestone occurred. They are not
        paid invoices or completed payouts.
      </p>
      {!query.data?.accruals.length && (
        <p className="text-sm">
          No accruals recorded. Unagreed terms do not generate charges.
        </p>
      )}
      {query.data?.accruals.map(a => (
        <p key={a.id} className="text-sm">
          {a.companyName} · Lead #{a.leadId} · {label(a.milestone)} · ₹
          {(Number(a.amountPaise) / 100).toLocaleString("en-IN")}
        </p>
      ))}
      <h2 className="font-semibold">Chatbot lead routing</h2>
      {query.data?.leads.map(lead => (
        <div key={lead.id} className="rounded border p-3 space-y-2">
          <p>
            #{lead.id} · {lead.firstName} {lead.lastName} ·{" "}
            {[lead.city, lead.state].filter(Boolean).join(", ")}
          </p>
          <p className="text-sm">{label(lead.stage || "awaiting_partner")}</p>
          {(!lead.stage ||
            ["awaiting_partner", "rejected", "cancelled"].includes(
              lead.stage
            )) && (
            <div className="flex flex-wrap gap-2">
              <select
                aria-label={`Installer for lead ${lead.id}`}
                className={field}
                value={choices[lead.id] || ""}
                onChange={e =>
                  setChoices({ ...choices, [lead.id]: e.target.value })
                }
              >
                <option value="">Choose installer</option>
                {query.data?.partners
                  .filter(
                    p => p.onboardingStatus === "ready" && p.acceptingLeads
                  )
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.companyName}
                    </option>
                  ))}
              </select>
              <Button
                disabled={assign.isPending || !choices[lead.id]}
                onClick={() =>
                  assign.mutate({
                    leadId: lead.id,
                    partnerId: Number(choices[lead.id]),
                  })
                }
              >
                Assign
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
