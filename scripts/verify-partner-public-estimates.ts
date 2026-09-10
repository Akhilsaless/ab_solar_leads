import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { appRouter } from "../server/routers";
import { partnerRouter } from "../server/partner";
import { getDb } from "../server/db";

const MARKER = "INTERNAL_PARTNER_PUBLIC_ESTIMATE_QA";
const rows = (result: any): any[] => Array.isArray(result?.[0]) ? result[0] : Array.isArray(result) ? result : [];
const first = (result: any) => rows(result)[0] ?? null;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const today = new Date().toISOString().slice(0, 10);
const validTo = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const now = new Date().toISOString();
const hasMonetaryOutput = (response: any) => Boolean(response?.estimate && [
  response.estimate.estimatedCost,
  response.estimate.subsidyAmount,
  response.estimate.netCost,
  response.estimate.estimatedSavingsMonthly,
  response.estimate.paybackYears,
  response.estimate.estimatedSavings25Year,
].some((value) => value !== null && value !== undefined));

async function cleanup(dbConn: any, partnerId: number) {
  const mapping = first(await dbConn.execute(sql`SELECT agencyId FROM partnerAgencyOnboarding WHERE partnerId = ${partnerId} LIMIT 1`));
  const agencyId = Number(mapping?.agencyId || 0);
  if (agencyId) {
    await dbConn.execute(sql`DELETE FROM chatMsgs3 WHERE conversationId IN (SELECT id FROM conversations3 WHERE agencyId = ${agencyId})`);
    await dbConn.execute(sql`DELETE FROM conversations3 WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM agencyConfigurationAudit WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM agencyFeatureControls WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM agencyStateEstimateInputs WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM agencyEstimateSettings WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM panelProducts3 WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM inverterProducts3 WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM partnerAgencyOnboarding WHERE agencyId = ${agencyId}`);
    await dbConn.execute(sql`DELETE FROM agencyConfig3 WHERE id = ${agencyId}`);
  }
  await dbConn.execute(sql`DELETE FROM solarPartners WHERE id = ${partnerId}`);
}

async function startAndAsk(chat: ReturnType<typeof appRouter.createCaller>, agencySlug: string, suffix: string) {
  const sessionId = `qa-public-estimate-${suffix}-${randomBytes(8).toString("hex")}`;
  await chat.chat.startConversation({ agencySlug, sessionId, utmSource: "internal_qa" });
  return chat.chat.sendMessage({ sessionId, message: "Telangana, Hyderabad, residential, ₹6500 monthly bill" }) as Promise<any>;
}

async function main() {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database unavailable");
  const suffix = randomBytes(6).toString("hex");
  const inviteToken = `invite-${suffix}`;
  const email = `qa-public-${suffix}@example.invalid`;
  const inviteResult = await dbConn.execute(sql`
    INSERT INTO solarPartners (companyName, email, phone, serviceAreas, status, signupTokenHash, signupExpiresAt)
    VALUES (${`${MARKER}_${suffix}`}, ${email}, '0000000000', ${JSON.stringify(["Telangana"])}, 'not_contacted', ${hash(inviteToken)}, ${Date.now() + 60 * 60 * 1000})
  `);
  const partnerId = Number((inviteResult as any)?.[0]?.insertId || (inviteResult as any)?.insertId);
  const partner = partnerRouter.createCaller({} as any);
  const chat = appRouter.createCaller({} as any);

  try {
    await partner.registerPartner({ token: inviteToken, companyName: `${MARKER}_${suffix}`, email, phone: "0000000000", whatsappNumber: undefined, serviceAreas: ["Telangana"], products: "", pricing: "", discounts: undefined, password: "SyntheticQaPass!2026" });
    const login = await partner.partnerLogin({ email, password: "SyntheticQaPass!2026" }) as any;
    const token = login.token as string;
    const initial = await partner.getMyOnboarding({ token }) as any;
    const agencyId = Number(initial.mapping.agencyId);
    const agency = first(await dbConn.execute(sql`SELECT agencySlug FROM agencyConfig3 WHERE id = ${agencyId} LIMIT 1`));
    if (!agency?.agencySlug) throw new Error("Synthetic partner agency was not created.");

    await partner.saveCompanySetup({ token, companyName: `${MARKER}_${suffix}`, phone: "0000000000", whatsappNumber: null, serviceAreas: ["Telangana"], city: "Hyderabad", state: "Telangana", address: "Internal QA only", website: null, logoUrl: null, brandColor: "#F97316" });
    const withheld = await startAndAsk(chat, agency.agencySlug, `${suffix}-withheld`);
    if (hasMonetaryOutput(withheld)) throw new Error("Unready partner workspace exposed a monetary estimate.");

    await partner.savePanelSetup({ token, brand: MARKER, model: "PANEL-500", wattage: 500, pricePerPanel: "100", efficiency: null, panelType: "test", warranty: 1, isActive: true, isPriceActive: true, pricingVersion: "qa-current", sourceNote: MARKER, effectiveFrom: today, effectiveTo: validTo, lastVerifiedAt: now });
    const snapshot = await partner.getMyOnboarding({ token }) as any;
    const panel = snapshot.panels[0];
    await partner.saveInverterSetup({ token, brand: MARKER, model: "INVERTER-5", capacityKw: "5", price: "200", inverterType: "test", warranty: 1, isActive: true, isPriceActive: true, pricingVersion: "qa-current", sourceNote: MARKER, effectiveFrom: today, effectiveTo: validTo, lastVerifiedAt: now });
    await partner.savePricingSetup({ token, pricingVersion: "qa-current", pricingMode: "catalog", installationCostPerKw: "100", balanceOfSystemCostPerKw: "100", taxRatePercent: null, warrantyTerms: null, pricingDisclosure: "Synthetic QA only. Final scope needs site verification.", sourceNote: MARKER, effectiveFrom: today, effectiveTo: validTo, lastVerifiedAt: now, isPricingActive: true });
    await partner.saveServiceAreaSetup({ token, stateName: "Telangana", stateCode: "TS", discomName: "Synthetic QA DISCOM", tariffPerUnit: "1", avgSunHours: "1", systemLossPercent: null, netMeteringStatus: "unknown", sourceNote: MARKER, effectiveFrom: today, effectiveTo: validTo, lastVerifiedAt: now, isActive: true });
    await partner.saveSubsidySetup({ token, subsidyMode: "hide_amount" });
    await partner.saveEstimateDisclosure({ token, pricingDisclosure: "Synthetic QA only. Final scope needs site verification.", warrantyTerms: null });
    const ready = await partner.getMyOnboarding({ token }) as any;
    if (ready.mapping.onboardingStatus !== "ready") throw new Error("Expected synthetic partner workspace to become ready.");

    const monetary = await startAndAsk(chat, agency.agencySlug, `${suffix}-ready`);
    if (monetary.stage !== "show_estimate" || !hasMonetaryOutput(monetary)) throw new Error("Ready partner workspace did not expose its verified synthetic monetary estimate.");

    await partner.savePanelSetup({ token, id: Number(panel.id), brand: MARKER, model: "PANEL-500", wattage: 500, pricePerPanel: "100", efficiency: null, panelType: "test", warranty: 1, isActive: false, isPriceActive: false, pricingVersion: "qa-current", sourceNote: MARKER, effectiveFrom: today, effectiveTo: validTo, lastVerifiedAt: null });
    const withheldAgain = await startAndAsk(chat, agency.agencySlug, `${suffix}-disabled`);
    if (hasMonetaryOutput(withheldAgain)) throw new Error("Disabled partner pricing still exposed a monetary estimate.");
    const leadCount = first(await dbConn.execute(sql`SELECT COUNT(*) AS count FROM leads2 WHERE agencyId = ${agencyId}`));
    if (Number(leadCount?.count || 0) !== 0) throw new Error("Synthetic non-contact chat created a lead.");

    console.log(JSON.stringify({ passed: true, monetaryWithheldBeforeReady: true, monetaryShownOnlyWhenReady: true, monetaryWithheldAfterDisable: true, noLeadCreated: true, syntheticOnly: true }));
  } finally {
    await cleanup(dbConn, partnerId);
  }
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
