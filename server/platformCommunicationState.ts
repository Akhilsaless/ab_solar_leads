export const PLATFORM_CHANNELS = ["email", "whatsapp"] as const;
export type PlatformChannel = typeof PLATFORM_CHANNELS[number];
export type AutomationState = "off" | "paused" | "running";
export type ChannelStatus = "not_configured" | "authentication_error" | "template_setup_required" | "ready" | "running" | "paused" | "off" | "error";

export type ChannelReadiness = {
  configured: boolean;
  verified: boolean;
  providerSupported: boolean;
  senderIdentityConfirmed: boolean;
  pricingReady: boolean;
  legalReady: boolean;
  featureEnabled: boolean;
  outreachMasterEnabled: boolean;
  emergencyStopActive: boolean;
};

export function isPlatformOwner(openId: string | null | undefined, ownerOpenId: string | null | undefined) {
  return Boolean(openId && ownerOpenId && openId === ownerOpenId);
}

export function isPlatformSuperAdmin(user: { openId?: string | null; role?: string | null } | null | undefined, ownerOpenId: string | null | undefined) {
  return Boolean(user?.role === "admin" && isPlatformOwner(user.openId, ownerOpenId));
}

export function startBlocker(channel: PlatformChannel, readiness: ChannelReadiness): string | null {
  if (readiness.emergencyStopActive) return "Emergency stop is active. Clear it before starting communication automation.";
  if (!readiness.configured) return `${channel === "email" ? "Email" : "WhatsApp"} configuration is required before automation can start.`;
  if (!readiness.providerSupported) return `${channel === "email" ? "Email" : "WhatsApp"} provider adapter is not installed.`;
  if (!readiness.verified) return "A successful provider verification is required before automation can start.";
  if (!readiness.senderIdentityConfirmed) return "Sender identity verification must be explicitly confirmed before automation can start.";
  if (!readiness.pricingReady) return "Verified agency pricing and state estimate inputs are required before automation can start.";
  if (!readiness.legalReady) return "Required consent, opt-out, and template prerequisites must be confirmed before automation can start.";
  if (!readiness.featureEnabled) return "The matching communication feature control must be explicitly enabled before automation can start.";
  if (!readiness.outreachMasterEnabled) return "The outreach master control must be explicitly enabled before automation can start.";
  return null;
}

export function transitionError(current: AutomationState, next: AutomationState): string | null {
  if (current === next) return null;
  if (next === "running" && current === "off") return null;
  if (next === "paused" && current === "running") return null;
  if (next === "running" && current === "paused") return null;
  if (next === "off") return null;
  return `Cannot change automation from ${current.toUpperCase()} to ${next.toUpperCase()} without an explicit supported transition.`;
}

export function displayStatus(status: ChannelStatus, state: AutomationState): ChannelStatus {
  if (state === "running") return "running";
  if (state === "paused") return "paused";
  if (status === "ready") return "off";
  return status;
}

export function canDispatchAutomated(channel: PlatformChannel, input: { state: AutomationState; status: ChannelStatus; emergencyStopActive: boolean }) {
  if (input.emergencyStopActive) return { allowed: false, reason: "Emergency stop is active." };
  if (input.state !== "running") return { allowed: false, reason: `${channel} automation is ${input.state.toUpperCase()}.` };
  if (input.status !== "running" && input.status !== "ready") return { allowed: false, reason: `${channel} provider is not ready.` };
  return { allowed: true as const, reason: null };
}

export function sanitizedConfigurationFields(input: Record<string, unknown>) {
  return Object.entries(input)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key]) => key)
    .sort();
}
