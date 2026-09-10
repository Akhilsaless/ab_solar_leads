export type FeatureControlInput = {
  emailAutomationEnabled?: boolean;
  whatsappAutomationEnabled?: boolean;
  smsOtpEnabled?: boolean;
  scheduledFollowUpsEnabled?: boolean;
  optionalAiFeaturesEnabled?: boolean;
};

export type Readiness = {
  emailReady: boolean;
  whatsappAdapterAvailable: boolean;
  smsOtpAdapterAvailable: boolean;
  optionalAiReady: boolean;
};

export function activationError(input: FeatureControlInput, readiness: Readiness): string | null {
  if (input.emailAutomationEnabled && !readiness.emailReady) return "Email automation requires explicit SMTP enablement and a verified SMTP connection.";
  if (input.whatsappAutomationEnabled && !readiness.whatsappAdapterAvailable) return "WhatsApp automation cannot be enabled until a real provider adapter and verified credentials are available.";
  if (input.smsOtpEnabled && !readiness.smsOtpAdapterAvailable) return "SMS or phone OTP cannot be enabled until a verified provider adapter is available.";
  if (input.scheduledFollowUpsEnabled && !readiness.emailReady) return "Scheduled follow-ups require verified, explicitly enabled SMTP before they can be activated.";
  if (input.optionalAiFeaturesEnabled && !readiness.optionalAiReady) return "Optional AI features require at least one healthy, enabled AI provider.";
  return null;
}

export function estimateSettingsActivationError(input: {
  isPricingActive?: boolean;
  pricingVersion?: string | null;
  sourceNote?: string | null;
  effectiveFrom?: string | Date | null;
  lastVerifiedAt?: string | Date | null;
  installationCostPerKw?: string | number | null;
  balanceOfSystemCostPerKw?: string | number | null;
}): string | null {
  if (!input.isPricingActive) return null;
  if (!input.pricingVersion?.trim() || input.pricingVersion === "draft") return "Activate pricing only with a named non-draft pricing version.";
  if (!input.sourceNote?.trim()) return "Activate pricing only after recording the verified source or owner approval note.";
  if (!input.effectiveFrom || !input.lastVerifiedAt) return "Activate pricing only with an effective date and verification timestamp.";
  if (input.installationCostPerKw == null || input.balanceOfSystemCostPerKw == null) return "Activate pricing only after verified installation and balance-of-system inputs are entered.";
  return null;
}

export function stateInputActivationError(input: {
  isActive?: boolean;
  tariffPerUnit?: string | number | null;
  avgSunHours?: string | number | null;
  sourceNote?: string | null;
  effectiveFrom?: string | Date | null;
  lastVerifiedAt?: string | Date | null;
}): string | null {
  if (!input.isActive) return null;
  if (input.tariffPerUnit == null || input.avgSunHours == null) return "Activate a state estimate input only with verified tariff and generation values.";
  if (!input.sourceNote?.trim() || !input.effectiveFrom || !input.lastVerifiedAt) return "Activate a state estimate input only after source, effective date, and verification timestamp are recorded.";
  return null;
}

export function catalogItemActivationError(input: {
  isPriceActive?: boolean;
  pricingVersion?: string | null;
  sourceNote?: string | null;
  effectiveFrom?: string | Date | null;
  lastVerifiedAt?: string | Date | null;
}): string | null {
  if (!input.isPriceActive) return null;
  if (!input.pricingVersion?.trim() || input.pricingVersion === "draft") return "Activate a catalog price only with a named non-draft pricing version.";
  if (!input.sourceNote?.trim() || !input.effectiveFrom || !input.lastVerifiedAt) return "Activate a catalog price only after source, effective date, and verification timestamp are recorded.";
  return null;
}
