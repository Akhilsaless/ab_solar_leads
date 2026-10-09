import { operationsRouter } from "../server/operations";
import type { TrpcContext } from "../server/_core/context";

function buildReadOnlyContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "production-controls-readonly-check",
      name: "Production controls check",
      email: null,
      loginMethod: "internal",
      role: "admin",
      createdAt: new Date(0),
      updatedAt: new Date(0),
      lastSignedIn: new Date(0),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

async function main() {
  const caller = operationsRouter.createCaller(buildReadOnlyContext());
  const status = await caller.status();

  const summary = {
    agencyId: status.agency.id,
    catalogReady: status.catalog.readyForMonetaryEstimates,
    verifiedPanelCount: status.catalog.verifiedPanelCount,
    verifiedInverterCount: status.catalog.verifiedInverterCount,
    activeStateInputCount: status.catalog.stateInputs.filter((input) => input.isActive).length,
    controls: status.controls,
    smtpState: status.integrations.smtp.state,
    smtpEnabled: status.integrations.smtp.enabled,
    whatsappState: status.integrations.whatsapp.state,
    smsOtpState: status.integrations.smsOtp.state,
  };

  const controlsEnabled = Object.values(status.controls ?? {}).some((value) => value === true);
  if (summary.catalogReady) throw new Error("Catalog must not be monetary-estimate-ready without owner-verified pricing inputs.");
  if (controlsEnabled) throw new Error("Agency feature controls must remain fail-closed for this verification.");
  if (summary.smtpEnabled || !["disabled", "platform_control_required"].includes(summary.smtpState)) throw new Error("SMTP must remain explicitly disabled.");
  if (summary.whatsappState !== "disabled" || summary.smsOtpState !== "disabled") throw new Error("WhatsApp and SMS/OTP must remain disabled.");

  console.log("[production-controls:verify]", JSON.stringify(summary, null, 2));
  console.log("[production-controls:verify] Runtime configuration path is read-only, tenant-scoped, and fail-closed.");
  process.exit(0);
}

main().catch((error) => {
  console.error("[production-controls:verify] FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
