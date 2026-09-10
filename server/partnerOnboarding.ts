import { isCurrentVerifiedCatalogItem } from "./catalogPricing";

export type PartnerOnboardingStatus = "setup_required" | "partially_configured" | "ready";

export type PartnerOnboardingSnapshot = {
  companyComplete: boolean;
  panelCount: number;
  inverterCount: number;
  pricingActive: boolean;
  stateInputReady: boolean;
  subsidyStepComplete: boolean;
  estimateSettingsComplete: boolean;
  panels: unknown[];
  inverters: unknown[];
};

export function normalizeCompletedSteps(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? safeJsonArray(value) : [];
  return Array.from(new Set(raw.map(Number).filter((step) => Number.isInteger(step) && step >= 1 && step <= 8))).sort((a, b) => a - b);
}

function safeJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function calculatePartnerOnboardingStatus(input: PartnerOnboardingSnapshot): PartnerOnboardingStatus {
  const hasAnyProgress = input.companyComplete || input.panelCount > 0 || input.inverterCount > 0 || input.pricingActive || input.stateInputReady || input.subsidyStepComplete || input.estimateSettingsComplete;
  const ready = input.companyComplete
    && input.panelCount > 0
    && input.inverterCount > 0
    && input.pricingActive
    && input.stateInputReady
    && input.subsidyStepComplete
    && input.estimateSettingsComplete
    && input.panels.some((panel) => isCurrentVerifiedCatalogItem(panel))
    && input.inverters.some((inverter) => isCurrentVerifiedCatalogItem(inverter));
  if (ready) return "ready";
  return hasAnyProgress ? "partially_configured" : "setup_required";
}

export function isPartnerMonetaryEstimateReady(input: PartnerOnboardingSnapshot): boolean {
  return calculatePartnerOnboardingStatus(input) === "ready";
}

export function nextIncompletePartnerStep(input: PartnerOnboardingSnapshot, completedSteps: unknown): number {
  const completed = new Set(normalizeCompletedSteps(completedSteps));
  const conditions = [
    input.companyComplete,
    input.panelCount > 0,
    input.inverterCount > 0,
    input.pricingActive,
    input.stateInputReady,
    input.subsidyStepComplete,
    input.estimateSettingsComplete,
    calculatePartnerOnboardingStatus(input) === "ready",
  ];
  const next = conditions.findIndex((done, index) => !done || !completed.has(index + 1));
  return next === -1 ? 8 : next + 1;
}

export function partnerOnboardingChecklist(input: PartnerOnboardingSnapshot) {
  return [
    { step: 1, label: "Company", complete: input.companyComplete },
    { step: 2, label: "Solar panels", complete: input.panelCount > 0 },
    { step: 3, label: "Inverters", complete: input.inverterCount > 0 },
    { step: 4, label: "System pricing", complete: input.pricingActive },
    { step: 5, label: "Service area & DISCOM", complete: input.stateInputReady },
    { step: 6, label: "Subsidy approach", complete: input.subsidyStepComplete },
    { step: 7, label: "Estimate settings", complete: input.estimateSettingsComplete },
    { step: 8, label: "Review", complete: calculatePartnerOnboardingStatus(input) === "ready" },
  ];
}
