import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatNextSteps({ sessionId }: { sessionId: string }) {
  const progress = trpc.solarOperations.customerProgress.useQuery(
    { sessionId },
    { retry: false, refetchOnWindowFocus: true }
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [slot, setSlot] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const refresh = () => {
    void progress.refetch();
  };
  const save = trpc.solarOperations.saveCustomerContact.useMutation({
    onSuccess: () => {
      refresh();
      setNotice(
        "Enquiry saved. We will match it with a suitable installer when available."
      );
    },
    onError: e => setNotice(e.message),
  });
  const send = trpc.chat.sendOtp.useMutation({
    onSuccess: d => setNotice(d.message),
    onError: e => setNotice(e.message),
  });
  const verify = trpc.chat.verifyOtp.useMutation({
    onSuccess: d => {
      setNotice(d.message);
      refresh();
    },
    onError: e => setNotice(e.message),
  });
  const book = trpc.solarOperations.customerBookSurvey.useMutation({
    onSuccess: () => {
      setNotice("Your survey slot is booked.");
      refresh();
    },
    onError: e => {
      setNotice(e.message);
      refresh();
    },
  });
  const proposal = trpc.solarOperations.customerProposal.useMutation({
    onSuccess: data => {
      const bytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = data.fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        `Preliminary proposal ${data.reference} downloaded. Valid through ${data.validUntil}.`
      );
    },
    onError: e => setNotice(e.message),
  });
  const status = progress.data;
  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border border-white/10 p-3 text-sm text-gray-200">
      <button
        type="button"
        className="min-h-10 text-left font-medium"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Your enquiry & survey booking {open ? "−" : "+"}
      </button>
      {open && (
        <div className="space-y-3 pt-2">
          {progress.isLoading && <p role="status">Loading your enquiry…</p>}
          {progress.error && (
            <p role="alert">
              Enquiry tools are temporarily unavailable. You can continue
              chatting.
            </p>
          )}
          {!status?.captured && !progress.error && (
            <>
              <p>
                Leave your details when you want installer follow-up. A quote
                and appointment depend on an available installer.
              </p>
              <label className="block">
                Your name
                <Input
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </label>
              <label className="block">
                Indian mobile number
                <Input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-1"
                />
                I agree to be contacted by Sales Squad and the assigned
                installer by phone, SMS and WhatsApp about this solar enquiry.
              </label>
              <Button
                disabled={
                  !consent ||
                  name.trim().length < 2 ||
                  phone.length < 10 ||
                  save.isPending
                }
                onClick={() =>
                  save.mutate({ sessionId, name, phone, consent: true })
                }
              >
                Save my enquiry
              </Button>
            </>
          )}
          {status?.captured && (
            <>
              <p>
                Status:{" "}
                <span className="capitalize">
                  {status.stage.replaceAll("_", " ")}
                </span>
                {status.partnerName
                  ? ` · ${status.partnerName}`
                  : " · Waiting for a suitable installer"}
              </p>
              <p>
                {status.phoneVerified
                  ? "Mobile number verified."
                  : "Mobile number not yet verified."}
              </p>
              {status.phoneVerified && status.partnerName && (
                <Button
                  disabled={proposal.isPending}
                  onClick={() => proposal.mutate({ sessionId })}
                >
                  Download installer proposal
                </Button>
              )}
              {!status.phoneVerified && status.verificationAvailable && (
                <div className="space-y-2">
                  <label className="block">
                    Confirm the mobile number you supplied
                    <Input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </label>
                  <Button
                    disabled={send.isPending}
                    onClick={() => send.mutate({ sessionId, phone })}
                  >
                    Send verification code
                  </Button>
                  <label className="block">
                    Six-digit code
                    <Input
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                    />
                  </label>
                  <Button
                    disabled={!/^\d{6}$/.test(code) || verify.isPending}
                    onClick={() => verify.mutate({ sessionId, otp: code })}
                  >
                    Verify mobile
                  </Button>
                </div>
              )}
              {!status.phoneVerified && !status.verificationAvailable && (
                <p>
                  Phone verification is not available yet. Your enquiry remains
                  saved.
                </p>
              )}
              {status.booking && (
                <p>
                  Survey:{" "}
                  {new Date(status.booking.startsAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST · {status.booking.city}
                </p>
              )}
              {status.slots.length > 0 && (
                <div className="space-y-2">
                  <label className="block">
                    Available survey slots
                    <select
                      className="block w-full rounded border bg-background p-2"
                      value={slot}
                      onChange={e => setSlot(e.target.value)}
                    >
                      <option value="">Choose a slot</option>
                      {status.slots.map(s => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.startsAt).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}{" "}
                          IST · {s.city}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                    />
                    I confirm I am available for this survey.
                  </label>
                  <Button
                    disabled={!slot || !confirmed || book.isPending}
                    onClick={() =>
                      book.mutate({
                        sessionId,
                        slotId: Number(slot),
                        confirmed: true,
                      })
                    }
                  >
                    Confirm survey booking
                  </Button>
                </div>
              )}
            </>
          )}
          {notice && <p role="status">{notice}</p>}
          <Button size="sm" variant="outline" onClick={refresh}>
            Refresh status
          </Button>
        </div>
      )}
    </section>
  );
}
