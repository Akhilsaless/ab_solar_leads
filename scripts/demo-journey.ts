import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { appRouter } from "../server/routers";
import { partnerRouter } from "../server/partner";
import { getDb, getUserByOpenId } from "../server/db";
import { captureConsentedChatLead } from "../server/chatCapture";
import { decryptGatewayCredential } from "../server/aiGateway";

const outputDir = new URL("../../../outputs/", import.meta.url);
mkdirSync(outputDir, { recursive: true });

// This harness must never write synthetic prices or identities into a live database.
const target = new URL(process.env.DATABASE_URL || "");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.port, "33316");
assert.equal(target.pathname, "/solar_demo");
assert.equal(process.env.OWNER_OPEN_ID, "demo-owner");
assert.equal(process.env.EMAIL_SENDING_ENABLED, "false");
assert.equal(process.env.SOLAR_PHONE_VERIFICATION_ENABLED, "false");
const db = (await getDb())!;
const rows = (result: any): any[] => result[0];
const first = async (query: any) => rows(await db.execute(query))[0];
const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const suffix = randomBytes(4).toString("hex");
const today = new Date().toISOString().slice(0, 10);
const until = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const note = "DEMO ONLY — synthetic fixture, not an approved customer price";
const checks: string[] = [];
const pass = (name: string) => { checks.push(name); console.log(`PASS ${name}`); };

// Legacy partner table is managed outside drizzle/schema.ts in the existing app.
await db.execute(sql`CREATE TABLE IF NOT EXISTS solarPartners (
 id int AUTO_INCREMENT PRIMARY KEY, companyName varchar(255), email varchar(320), phone varchar(30), whatsappNumber varchar(30),
 serviceAreas json, status varchar(40), products text, pricing text, discounts text, passwordHash varchar(255),
 signupTokenHash varchar(64), signupExpiresAt bigint, loginToken varchar(255), loginTokenHash varchar(64), loginExpiresAt bigint,
 signedUpAt timestamp NULL, emailSentAt timestamp NULL, pricingSheetUrl text, productListUrl text,
 createdAt timestamp DEFAULT CURRENT_TIMESTAMP, updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
await db.execute(sql`INSERT IGNORE INTO users (id,openId,name,email,role) VALUES (1,'demo-owner','Demo Owner','owner@example.invalid','admin')`);
await db.execute(sql`INSERT IGNORE INTO agencyConfig3 (id,userId,agencyName,agencySlug,city,state,botGreeting) VALUES (1,1,'DEMO ONLY Sales Squad','sales-squad','Hyderabad','Telangana','Demo only. Tell us about your solar enquiry; all prices here are synthetic.')`);
const publicCaller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
const ownerCaller = appRouter.createCaller({ user: (await getUserByOpenId("demo-owner"))!, req: {} as any, res: {} as any });
const partner = partnerRouter.createCaller({} as any);
const email = `installer-${suffix}@example.invalid`, password = "DemoOnly!2026";
const invitation = randomBytes(24).toString("base64url");
const inserted: any = await db.execute(sql`INSERT INTO solarPartners (companyName,email,phone,serviceAreas,status,signupTokenHash,signupExpiresAt) VALUES (${`DEMO ONLY Installer ${suffix}`},${email},'0000000000',${JSON.stringify(["Telangana"])},'not_contacted',${sha(invitation)},${Date.now()+3600000})`);
const partnerId = Number(inserted[0].insertId);
await partner.registerPartner({ token: invitation, companyName: `DEMO ONLY Installer ${suffix}`, email, phone: "0000000000", serviceAreas: ["Telangana"], password });
const { token } = await partner.partnerLogin({ email, password });
pass("installer invitation, registration and password login");
await partner.saveCompanySetup({ token, companyName: `DEMO ONLY Installer ${suffix}`, phone: "0000000000", serviceAreas: ["Telangana"], city: "Hyderabad", state: "Telangana", address: "DEMO ONLY", whatsappNumber: null });
const validity = { pricingVersion: "DEMO-2026-11", sourceNote: note, effectiveFrom: today, effectiveTo: until, lastVerifiedAt: new Date().toISOString() };
await partner.savePanelSetup({ token, brand: "DEMO", model: "Synthetic 500W", wattage: 500, pricePerPanel: "12000", warranty: 1, isActive: true, isPriceActive: true, ...validity });
await partner.saveInverterSetup({ token, brand: "DEMO", model: "Synthetic 5kW", capacityKw: "5", price: "40000", warranty: 1, isActive: true, isPriceActive: true, ...validity });
await partner.savePricingSetup({ token, pricingMode: "catalog", installationCostPerKw: "4000", balanceOfSystemCostPerKw: "6000", taxRatePercent: "18", pricingDisclosure: note, isPricingActive: true, ...validity });
await partner.saveServiceAreaSetup({ token, stateName: "Telangana", stateCode: "TG", discomName: "DEMO DISCOM", tariffPerUnit: "8", avgSunHours: "5", systemLossPercent: "15", netMeteringStatus: "unknown", isActive: true, sourceNote: note, effectiveFrom: today, effectiveTo: until, lastVerifiedAt: new Date().toISOString() });
await partner.saveSubsidySetup({ token, subsidyMode: "hide_amount" });
await partner.saveEstimateDisclosure({ token, pricingDisclosure: note });
await partner.reviewOnboarding({ token });
const setup = await partner.getMyOnboarding({ token });
assert.equal(setup.mapping.onboardingStatus, "ready");
await publicCaller.solarOperations.saveAvailability({ token, acceptingLeads: true, cities: ["Hyderabad"], pincodes: [] });
pass("complete installer catalogue, pricing, service coverage and acceptance readiness");

const sessionId = `demo-customer-${suffix}-session`;
const phone = `9${String(parseInt(suffix,16)).padStart(9,"0").slice(-9)}`;
const previousLeads = Number((await first(sql`SELECT COUNT(*) n FROM leads2`)).n);
await publicCaller.chat.startConversation({ agencySlug: "sales-squad", sessionId, utmSource: "isolated_demo" });
await db.execute(sql`UPDATE conversations3 SET customerCity='Hyderabad',customerState='Telangana',monthlyBill=3000 WHERE sessionId=${sessionId}`);
await assert.rejects(publicCaller.solarOperations.saveCustomerContact({ sessionId, name: "Demo Customer", phone: "9876543210", consent: false } as any));
assert.equal(Number((await first(sql`SELECT COUNT(*) n FROM leads2`)).n), previousLeads);
pass("contact capture rejects missing affirmative consent");
const contact = { sessionId, name: "DEMO Customer", phone, consent: true as const };
const captures = await Promise.all([publicCaller.solarOperations.saveCustomerContact(contact),publicCaller.solarOperations.saveCustomerContact(contact)]);
assert.equal(captures[0].leadId,captures[1].leadId);
const leadId = Number(captures[0].leadId);
assert.equal(Number((await first(sql`SELECT COUNT(*) n FROM leads2`)).n),previousLeads+1);
assert.equal((await first(sql`SELECT assignedPartnerId FROM leads2 WHERE id=${leadId}`)).assignedPartnerId,null);
pass("consented enquiry captured exactly once and initially unassigned");
await assert.rejects(publicCaller.solarOperations.assign({ leadId, partnerId }));
await ownerCaller.solarOperations.assign({ leadId, partnerId });
pass("owner assignment succeeds; anonymous assignment rejected");
const workflow = async () => first(sql`SELECT * FROM solarLeadWorkflow WHERE leadId=${leadId}`);
await publicCaller.solarOperations.advance({ token, leadId, version: (await workflow()).version, stage: "accepted", note: "Demo installer accepts" });
await assert.rejects(publicCaller.solarOperations.advance({ token, leadId, version: 0, stage: "cancelled", note: "Stale action" }));
pass("installer acceptance persists; stale workflow update rejected");
const progress = await publicCaller.solarOperations.customerProgress({ sessionId });
assert.equal(progress.phoneVerified,false);
assert.equal(progress.partnerName,null);
await assert.rejects(publicCaller.solarOperations.customerProposal({ sessionId }));
pass("unverified customer cannot obtain installer details or proposal");
// Simulate provider-approved possession only in this isolated fixture. No OTP provider has been tested.
await db.execute(sql`UPDATE solarChatIdentity SET phoneVerifiedAt=NOW() WHERE sessionId=${sessionId}`);
const startsAt = new Date(Date.now()+86400000).toISOString(), endsAt = new Date(Date.now()+90000000).toISOString();
await publicCaller.solarOperations.addSlot({ token, startsAt, endsAt, city: "Hyderabad" });
const slots = (await publicCaller.solarOperations.customerProgress({sessionId})).slots;
assert.equal(slots.length,1);
await publicCaller.solarOperations.customerBookSurvey({ sessionId, slotId: slots[0].id, confirmed: true });
await assert.rejects(publicCaller.solarOperations.customerBookSurvey({ sessionId, slotId: slots[0].id, confirmed: true }));
await publicCaller.solarOperations.advance({ token,leadId,version:(await workflow()).version,stage:"survey_completed",note:"DEMO ONLY survey evidence" });
pass("customer books future slot once; installer records survey completion (phone verification simulated)");
const proposal = await publicCaller.solarOperations.customerProposal({ sessionId });
const stored = await first(sql`SELECT snapshot, encryptedDownloadToken FROM solarProposals WHERE reference=${proposal.reference}`);
const snapshot = typeof stored.snapshot === "string" ? JSON.parse(stored.snapshot) : stored.snapshot;
assert.equal(snapshot.quote.taxRate,18,"proposal must retain configured tax/markup");
assert.equal(snapshot.quote.tax,Math.round(snapshot.quote.subtotal * .18 * 100)/100);
assert.equal(snapshot.quote.total,snapshot.quote.subtotal + snapshot.quote.tax);
assert.equal(snapshot.quote.subsidyAmount,null);
assert.equal(proposal.whatsappQueued,false);
assert.ok(Buffer.from(proposal.pdfBase64,"base64").subarray(0,4).equals(Buffer.from("%PDF")));
writeFileSync(new URL("../../../outputs/Demo_Solar_Proposal.pdf",import.meta.url),Buffer.from(proposal.pdfBase64,"base64"));
pass("itemized PDF proposal uses configured tax, withholds subsidy and queues no outbound message");
const downloadToken = decryptGatewayCredential(stored.encryptedDownloadToken);
await publicCaller.solarOperations.advance({ token,leadId,version:(await workflow()).version,stage:"proposal_sent",note:"Demo proposal prepared; no external send" });
assert.equal(Number((await first(sql`SELECT COUNT(*) n FROM solarCommercialAccruals`)).n),0);
assert.equal(Number((await first(sql`SELECT COUNT(*) n FROM solarWhatsAppMessages`)).n),0);
pass("unagreed terms create no commercial accrual; disabled WhatsApp creates no message");
const expired = new Date(Date.now()-86400000).toISOString().slice(0,10);
await db.execute(sql`UPDATE panelProducts3 SET effectiveTo=${expired} WHERE agencyId=${setup.mapping.agencyId}`);
await assert.rejects(publicCaller.solarOperations.customerProposal({sessionId}));
await db.execute(sql`UPDATE panelProducts3 SET effectiveTo=${until} WHERE agencyId=${setup.mapping.agencyId}`);
pass("expired catalogue blocks new proposals even after installer acceptance");
const conversation = await first(sql`SELECT * FROM conversations3 WHERE sessionId=${sessionId}`);
await captureConsentedChatLead(db,conversation,{name:"DEMO Customer",phone},[{role:"customer",content:"Do not contact me. I withdraw consent."}]);
assert.equal((await publicCaller.solarOperations.customerProgress({sessionId})).captured,false);
await assert.rejects(publicCaller.solarOperations.customerProposal({sessionId}));
pass("consent withdrawal blocks customer progress and new proposal access");
// Restore affirmative demo consent for the user-facing local walkthrough, without verifying a real phone.
await publicCaller.solarOperations.saveCustomerContact(contact);
writeFileSync(new URL("../../../outputs/Demo_Journey_Result.json",import.meta.url),JSON.stringify({ checkedAt:new Date().toISOString(),baselineCommit:"de30aaacaa9a4d5426f57ff7afb6d605980fc8e2",localFix:"retain taxRatePercent in installer pricing snapshot",environment:"isolated local MySQL",phoneVerification:"SIMULATED ONLY",checks,leadId,partnerId,proposalReference:proposal.reference,syntheticOnly:true },null,2));
writeFileSync(new URL("../demo-session.json",import.meta.url),JSON.stringify({ email,password,token,sessionId,leadId,partnerId,downloadToken },null,2));
console.log(`DEMO JOURNEY PASSED: ${checks.length} checks`);
process.exit(0);
