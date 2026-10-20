function validDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
export function isCurrentVerifiedInput(item: any, now = new Date()) {
  if (!item) return false;
  const today = now.toISOString().slice(0, 10);
  const from = validDate(item.effectiveFrom), to = validDate(item.effectiveTo), verified = validDate(item.lastVerifiedAt);
  return Boolean(item.sourceNote?.trim() && verified && verified <= today && from && from <= today && (!item.effectiveTo || (to && to >= today)));
}
export function isCurrentVerifiedCatalogItem(item: any, now = new Date()) {
  if (!item || !item.isActive || !item.isPriceActive) return false;
  return Boolean(item.pricingVersion?.trim() && item.pricingVersion !== "draft" && isCurrentVerifiedInput(item, now));
}

export function isVerifiedPricingReady(input: { pricingActive?: boolean; stateInput?: unknown; panels: any[]; inverters: any[]; now?: Date }) {
  return Boolean(input.pricingActive && input.stateInput && input.panels.some(item => isCurrentVerifiedCatalogItem(item, input.now)) && input.inverters.some(item => isCurrentVerifiedCatalogItem(item, input.now)));
}
