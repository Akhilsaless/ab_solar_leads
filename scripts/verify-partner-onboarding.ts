import { createHash, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { partnerRouter } from "../server/partner";
import { getDb } from "../server/db";

const TEST_MARKER = "INTERNAL_PARTNER_ONBOARDING_QA";
const date = new Date().toISOString().slice(0, 10);
const validTo = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const now = new Date().toISOString();
const rows = (result: any): any[] => Array.isArray(result?.[0]) ? result[0] : Array.isArray(result) ? result : [];
const first = (result: any) => rows(result)[0] ?? null;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

async function createSyntheticInvitation(dbConn: any, suffix: string) {
  const email = `qa-${suffix.toLowerCase()}@example.invalid`;
  const inviteToken = `invite-${suffix}`;
  const result = await dbConn.execute(sql`
    INSERT INTO solarPartners (companyName, email, phone, serviceAreas, status, signupTokenHash, signupExpiresAt)
    VALUES (${`${TEST_MARKER}_${suffix}`}, ${email}, '0000000000', ${JSON.stringify(["QA State"])}, 'not_contacted', ${hash(inviteToken)}, ${Date.now() + 60 * 60 * 1000})
  `);
  const partnerId = Number(result?.[0]?.insertId || result?.insertId);
  return { partnerId, inviteToken, email };
}

async function cleanup(dbConn: any, partnerIds: number[]) {
  const mappingRows = rows(await dbConn.execute(sql`SELECT agencyId FROM partnerAgencyOnboarding WHERE partnerId IN (${sql.join(partnerIds.map((id) => sql`${id}`), sql`, `)})`));
  const agencyIds = mappingRows.map((item: any) => Number(item.agencyId)).filter(Boolean);
  if (agencyIds.length) {
    const ids = sql.join(agencyIds.map((id) => sql`${id}`), sql`, `);
    await dbConn.execute(sql`DELETE FROM agencyConfigurationAudit WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyFeatureControls WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyStateEstimateInputs WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyEstimateSettings WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM panelProducts3 WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM inverterProducts3 WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM partnerAgencyOnboarding WHERE agencyId IN (${ids})`);
    await dbConn.execute(sql`DELETE FROM agencyConfig3 WHERE id IN (${ids})`);
  }
  if (partnerIds.length) {
    await dbConn.execute(sql`DELETE FROM solarPartners WHERE id IN (${sql.join(partnerIds.map((id) => sql`${id}`), sql`, `)})`);
  }
}

async function main() {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");
  const suffix = randomBytes(6).toString("hex");
  const one = await createSyntheticInvitation(dbConn, `${suffix}-one`);
  const two = await createSyntheticInvitation(dbConn, `${suffix}-two`);
  const caller = partnerRouter.createCaller({} as any);
  try {
    await caller.registerPartner({ token: one.inviteToken, companyName: `${TEST_MARKER}_ONE`, email: one.email, phone: "0000000000", whatsappNumber: undefined, serviceAreas: ["QA State"], products: "", pricing: "", discounts: undefined, password: "SyntheticQaPass!2026" });
    await caller.registerPartner({ token: two.inviteToken, companyName: `${TEST_MARKER}_TWO`, email: two.email, phone: "0000000000", whatsappNumber: undefined, serviceAreas: ["QA State"], products: "", pricing: "", discounts: undefined, password: "SyntheticQaPass!2026" });
    const firstLogin = await caller.partnerLogin({ email: one.email, password: "SyntheticQaPass!2026" }) as any;
    const secondLogin = await caller.partnerLogin({ email: two.email, password: "SyntheticQaPass!2026" }) as any;
    one.token = firstLogin.token;
    two.token = secondLogin.token;
    const initial = await caller.getMyOnboarding({ token: one.token }) as any;
    if (initial.mapping.onboardingStatus !== "setup_required") throw new Error("Expected SETUP REQUIRED state.");
    const firstAgencyId = Number(initial.mapping.agencyId);

    await caller.saveCompanySetup({ token: one.token, companyName: `${TEST_MARKER}_ONE`, phone: "0000000000", whatsappNumber: null, serviceAreas: ["QA State"], city: "QA City", state: "QA State", address: "Internal test only", website: null, logoUrl: null, brandColor: "#F97316" });
    await caller.savePanelSetup({ token: one.token, brand: TEST_MARKER, model: "PANEL-A", wattage: 500, pricePerPanel: "100", efficiency: null, panelType: "test", warranty: 1, isActive: true, isPriceActive: true, pricingVersion: "qa-valid", sourceNote: TEST_MARKER, effectiveFrom: date, effectiveTo: validTo, lastVerifiedAt: now });
    const withPanel = await caller.getMyOnboarding({ token: one.token }) as any;
    if (withPanel.mapping.onboardingStatus !== "partially_configured") throw new Error("Expected PARTIALLY CONFIGURED state.");
    const firstPanel = withPanel.panels[0];
    await caller.saveInverterSetup({ token: one.token, brand: TEST_MARKER, model: "INVERTER-A", capacityKw: "5", price: "200", inverterType: "test", warranty: 1, isActive: true, isPriceActive: true, pricingVersion: "qa-valid", sourceNote: TEST_MARKER, effectiveFrom: date, effectiveTo: validTo, lastVerifiedAt: now });
    await caller.savePricingSetup({ token: one.token, pricingVersion: "qa-valid", pricingMode: "catalog", installationCostPerKw: "100", balanceOfSystemCostPerKw: "100", taxRatePercent: null, warrantyTerms: null, pricingDisclosure: "Internal QA only. Final scope requires verification.", sourceNote: TEST_MARKER, effectiveFrom: date, effectiveTo: validTo, lastVerifiedAt: now, isPricingActive: true });
    await caller.saveServiceAreaSetup({ token: one.token, stateName: "QA State", stateCode: "QAT", discomName: "QA DISCOM", tariffPerUnit: "1", avgSunHours: "1", systemLossPercent: null, netMeteringStatus: "unknown", sourceNote: TEST_MARKER, effectiveFrom: date, effectiveTo: validTo, lastVerifiedAt: now, isActive: true });
    await caller.saveSubsidySetup({ token: one.token, subsidyMode: "hide_amount" });
    await caller.saveEstimateDisclosure({ token: one.token, pricingDisclosure: "Internal QA only. Final scope requires verification.", warrantyTerms: null });
    const ready = await caller.getMyOnboarding({ token: one.token }) as any;
    if (ready.mapping.onboardingStatus !== "ready") throw new Error("Expected READY after all verified synthetic setup inputs.");
    await caller.reviewOnboarding({ token: one.token });

    const second = await caller.getMyOnboarding({ token: two.token }) as any;
    if (second.panels.length !== 0 || second.inverters.length !== 0 || second.mapping.agencyId === firstAgencyId) throw new Error("Cross-agency catalog isolation failed.");
    let crossAgencyBlocked = false;
    try {
      await caller.savePanelSetup({ token: two.token, id: Number(firstPanel.id), brand: TEST_MARKER, model: "PANEL-A", wattage: 500, pricePerPanel: "100", efficiency: null, panelType: "test", warranty: 1, isActive: true, isPriceActive: true, pricingVersion: "qa-valid", sourceNote: TEST_MARKER, effectiveFrom: date, effectiveTo: validTo, lastVerifiedAt: now });
    } catch {
      crossAgencyBlocked = true;
    }
    if (!crossAgencyBlocked) throw new Error("Cross-agency panel update was not blocked.");

    await caller.savePanelSetup({ token: one.token, id: Number(firstPanel.id), brand: TEST_MARKER, model: "PANEL-A", wattage: 500, pricePerPanel: "100", efficiency: null, panelType: "test", warranty: 1, isActive: false, isPriceActive: false, pricingVersion: "qa-valid", sourceNote: TEST_MARKER, effectiveFrom: date, effectiveTo: validTo, lastVerifiedAt: null });
    const disabled = await caller.getMyOnboarding({ token: one.token }) as any;
    if (disabled.mapping.onboardingStatus === "ready") throw new Error("Disabling an active catalog item must remove READY status.");

    console.log(JSON.stringify({ passed: true, firstAgencyId, secondAgencyId: Number(second.mapping.agencyId), states: [initial.mapping.onboardingStatus, withPanel.mapping.onboardingStatus, ready.mapping.onboardingStatus, disabled.mapping.onboardingStatus], crossAgencyBlocked, syntheticOnly: true }));
  } finally {
    await cleanup(dbConn, [one.partnerId, two.partnerId]);
  }
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
