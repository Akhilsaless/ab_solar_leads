export function isCurrentVerifiedCatalogItem(item: any, now = new Date()) {
  if (!item || !item.isActive || !item.isPriceActive) return false;
  const today = now.toISOString().slice(0, 10);
  const effectiveFrom = item.effectiveFrom ? new Date(item.effectiveFrom).toISOString().slice(0, 10) : null;
  const effectiveTo = item.effectiveTo ? new Date(item.effectiveTo).toISOString().slice(0, 10) : null;
  return Boolean(item.pricingVersion && item.pricingVersion !== "draft" && item.sourceNote && item.lastVerifiedAt && effectiveFrom && effectiveFrom <= today && (!effectiveTo || effectiveTo >= today));
}

export function isVerifiedPricingReady(input: { pricingActive?: boolean; stateInput?: unknown; panels: any[]; inverters: any[]; now?: Date }) {
  return Boolean(input.pricingActive && input.stateInput && input.panels.some(item => isCurrentVerifiedCatalogItem(item, input.now)) && input.inverters.some(item => isCurrentVerifiedCatalogItem(item, input.now)));
}
