import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { calculatePartnerOnboardingStatus, nextIncompletePartnerStep, normalizeCompletedSteps, partnerOnboardingChecklist, type PartnerOnboardingStatus, type PartnerOnboardingSnapshot } from "./partnerOnboarding";

type PartnerSession = {
  id: number;
  companyName: string;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  serviceAreas?: unknown;
};

function rows(result: any): any[] {
  return Array.isArray(result?.[0]) ? result[0] : Array.isArray(result) ? result : [];
}

function firstRow(result: any): any | null {
  return rows(result)[0] ?? null;
}

function insertId(result: any): number {
  return Number(Array.isArray(result) ? result[0]?.insertId : result?.insertId || 0);
}

function toServiceAreas(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function slugPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "solar-partner";
}

export async function ensurePartnerAgency(dbConn: any, partner: PartnerSession) {
  const existing = firstRow(await dbConn.execute(sql`
    SELECT p.id AS mappingId, p.partnerId, p.agencyId, p.onboardingStatus, p.currentStep, p.completedSteps, p.subsidyMode, p.reviewedAt,
           a.agencyName, a.agencySlug, a.phone, a.email, a.whatsappNumber, a.city, a.state, a.address, a.logoUrl, a.brandColor, a.website
    FROM partnerAgencyOnboarding p
    INNER JOIN agencyConfig3 a ON a.id = p.agencyId
    WHERE p.partnerId = ${partner.id}
    LIMIT 1
  `));
  if (existing) return existing;

  const areas = toServiceAreas(partner.serviceAreas);
  const initialState = areas[0] || null;
  const slug = `${slugPart(partner.companyName)}-${partner.id}-${nanoid(5).toLowerCase()}`;
  const result = await dbConn.execute(sql`
    INSERT INTO agencyConfig3 (userId, agencyName, agencySlug, phone, email, state, whatsappNumber, isActive)
    VALUES (${0 - Number(partner.id)}, ${partner.companyName}, ${slug}, ${partner.phone || null}, ${partner.email || null}, ${initialState}, ${partner.whatsappNumber || null}, TRUE)
  `);
  const agencyId = insertId(result);
  if (!agencyId) throw new Error("Could not create the partner workspace.");
  await dbConn.execute(sql`
    INSERT INTO partnerAgencyOnboarding (partnerId, agencyId, onboardingStatus, currentStep, completedSteps, subsidyMode)
    VALUES (${partner.id}, ${agencyId}, 'setup_required', 1, ${JSON.stringify([])}, 'hide_amount')
  `);
  return firstRow(await dbConn.execute(sql`
    SELECT p.id AS mappingId, p.partnerId, p.agencyId, p.onboardingStatus, p.currentStep, p.completedSteps, p.subsidyMode, p.reviewedAt,
           a.agencyName, a.agencySlug, a.phone, a.email, a.whatsappNumber, a.city, a.state, a.address, a.logoUrl, a.brandColor, a.website
    FROM partnerAgencyOnboarding p
    INNER JOIN agencyConfig3 a ON a.id = p.agencyId
    WHERE p.partnerId = ${partner.id}
    LIMIT 1
  `));
}

export async function getPartnerOnboardingSnapshot(dbConn: any, partner: PartnerSession) {
  const mapping = await ensurePartnerAgency(dbConn, partner);
  const [panelsResult, invertersResult, pricingResult, stateInputsResult] = await Promise.all([
    dbConn.execute(sql`SELECT id, brand, model, wattage, pricePerPanel, efficiency, panelType, warranty, isActive, isPriceActive, pricingVersion, sourceNote, lastVerifiedAt, effectiveFrom, effectiveTo FROM panelProducts3 WHERE agencyId = ${mapping.agencyId}`),
    dbConn.execute(sql`SELECT id, brand, model, capacityKw, price, inverterType, warranty, isActive, isPriceActive, pricingVersion, sourceNote, lastVerifiedAt, effectiveFrom, effectiveTo FROM inverterProducts3 WHERE agencyId = ${mapping.agencyId}`),
    dbConn.execute(sql`SELECT pricingVersion, pricingMode, installationCostPerKw, balanceOfSystemCostPerKw, pricingDisclosure, sourceNote, effectiveFrom, effectiveTo, lastVerifiedAt, isPricingActive FROM agencyEstimateSettings WHERE agencyId = ${mapping.agencyId} LIMIT 1`),
    dbConn.execute(sql`SELECT id, stateName, stateCode, discomName, tariffPerUnit, avgSunHours, systemLossPercent, netMeteringStatus, subsidyDisclosure, subsidySourceUrl, sourceNote, effectiveFrom, effectiveTo, lastVerifiedAt, isActive FROM agencyStateEstimateInputs WHERE agencyId = ${mapping.agencyId} ORDER BY stateName ASC`),
  ]);
  const panels = rows(panelsResult);
  const inverters = rows(invertersResult);
  const pricing = firstRow(pricingResult);
  const stateInputs = rows(stateInputsResult);
  const completedSteps = normalizeCompletedSteps(mapping.completedSteps);
  const subsidyMode = String(mapping.subsidyMode || "hide_amount") as "disclose_verified" | "hide_amount";
  const hasVerifiedSubsidyDisclosure = stateInputs.some((item: any) => item.isActive && item.subsidyDisclosure && item.subsidySourceUrl);
  const snapshot: PartnerOnboardingSnapshot = {
    companyComplete: completedSteps.includes(1) && Boolean(mapping.agencyName && (mapping.phone || mapping.email) && (mapping.city || mapping.state || toServiceAreas(partner.serviceAreas).length)),
    panelCount: panels.filter((item: any) => Boolean(item.isActive)).length,
    inverterCount: inverters.filter((item: any) => Boolean(item.isActive)).length,
    pricingActive: Boolean(pricing?.isPricingActive && pricing?.pricingVersion !== "draft" && pricing?.sourceNote && pricing?.effectiveFrom && pricing?.effectiveTo && pricing?.lastVerifiedAt && pricing?.installationCostPerKw != null && pricing?.balanceOfSystemCostPerKw != null),
    stateInputReady: stateInputs.some((item: any) => Boolean(item.isActive && item.tariffPerUnit != null && item.avgSunHours != null && item.sourceNote && item.effectiveFrom && item.effectiveTo && item.lastVerifiedAt)),
    subsidyStepComplete: completedSteps.includes(6) && (subsidyMode === "hide_amount" || hasVerifiedSubsidyDisclosure),
    estimateSettingsComplete: completedSteps.includes(7) && Boolean(pricing?.pricingDisclosure?.trim()),
    panels,
    inverters,
  };
  const onboardingStatus = calculatePartnerOnboardingStatus(snapshot);
  const currentStep = nextIncompletePartnerStep(snapshot, completedSteps);
  const checklist = partnerOnboardingChecklist(snapshot);
  await dbConn.execute(sql`
    UPDATE partnerAgencyOnboarding
    SET onboardingStatus = ${onboardingStatus}, currentStep = ${currentStep}
    WHERE id = ${mapping.mappingId}
  `);
  return { mapping: { ...mapping, onboardingStatus, currentStep, completedSteps, subsidyMode }, snapshot, panels, inverters, pricing, stateInputs, checklist };
}

export async function markPartnerOnboardingStep(dbConn: any, partner: PartnerSession, step: number, options?: { subsidyMode?: "disclose_verified" | "hide_amount"; reviewed?: boolean }) {
  const { mapping } = await getPartnerOnboardingSnapshot(dbConn, partner);
  const completedSteps = Array.from(new Set([...mapping.completedSteps, step])).sort((a, b) => a - b);
  await dbConn.execute(sql`
    UPDATE partnerAgencyOnboarding
    SET completedSteps = ${JSON.stringify(completedSteps)},
        subsidyMode = ${options?.subsidyMode || mapping.subsidyMode},
        reviewedAt = ${options?.reviewed ? new Date() : mapping.reviewedAt || null}
    WHERE id = ${mapping.mappingId}
  `);
  return getPartnerOnboardingSnapshot(dbConn, partner);
}

export async function isPartnerAgencyReadyForMonetaryEstimates(dbConn: any, agencyId: number): Promise<boolean | null> {
  const result = firstRow(await dbConn.execute(sql`
    SELECT onboardingStatus FROM partnerAgencyOnboarding WHERE agencyId = ${agencyId} LIMIT 1
  `));
  if (!result) return null;
  return result.onboardingStatus === "ready";
}

export type { PartnerOnboardingStatus };
