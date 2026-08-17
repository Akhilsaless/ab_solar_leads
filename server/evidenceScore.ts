export type EvidenceLeadInput = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  company?: string | null;
  businessType?: string | null;
  businessSize?: string | null;
  website?: string | null;
  propertyAddress?: string | null;
  city?: string | null;
  state?: string | null;
  monthlyEnergyBill?: string | number | null;
  homeownershipType?: string | null;
  installationTimeline?: string | null;
  status?: string | null;
  isDnc?: boolean | number | null;
  source?: string | null;
};

export type EvidenceDimension = {
  id: string;
  label: string;
  score: number;
  max: number;
  evidence: string[];
};

export type LeadEvidenceScore = {
  score: number;
  tier: "sales_ready" | "research_first" | "nurture" | "insufficient_evidence" | "blocked";
  confidence: number;
  dimensions: EvidenceDimension[];
  missingEvidence: string[];
  riskFlags: string[];
  nextAction: string;
  scoringVersion: string;
};

const truthy = (value: unknown) => Boolean(value && String(value).trim());

export function calculateEvidenceScore(lead: EvidenceLeadInput): LeadEvidenceScore {
  const missingEvidence: string[] = [];
  const riskFlags: string[] = [];
  const dimensions: EvidenceDimension[] = [];
  const isBlocked = Boolean(lead.isDnc);

  const contactEvidence: string[] = [];
  let contactScore = 0;
  if (truthy(lead.firstName) || truthy(lead.lastName)) { contactScore += 4; contactEvidence.push("Named contact captured"); }
  if (truthy(lead.phone) || truthy(lead.whatsapp)) { contactScore += 8; contactEvidence.push("Phone or WhatsApp contact captured"); }
  if (truthy(lead.email)) { contactScore += 8; contactEvidence.push("Email contact captured"); }
  if (!truthy(lead.phone) && !truthy(lead.whatsapp) && !truthy(lead.email)) missingEvidence.push("A verified phone, WhatsApp number, or work email");
  dimensions.push({ id: "contact", label: "Contactability", score: contactScore, max: 20, evidence: contactEvidence });

  const locationEvidence: string[] = [];
  let locationScore = 0;
  if (truthy(lead.city) && truthy(lead.state)) { locationScore += 10; locationEvidence.push("City and state captured"); }
  else if (truthy(lead.state)) { locationScore += 5; locationEvidence.push("State captured"); }
  if (truthy(lead.propertyAddress)) { locationScore += 5; locationEvidence.push("Property address captured"); }
  if (!truthy(lead.city) || !truthy(lead.state)) missingEvidence.push("Confirmed city and state");
  if (!truthy(lead.propertyAddress)) missingEvidence.push("Facility or property address");
  dimensions.push({ id: "location", label: "Location evidence", score: locationScore, max: 15, evidence: locationEvidence });

  const energyEvidence: string[] = [];
  let energyScore = 0;
  const bill = Number(lead.monthlyEnergyBill || 0);
  if (bill >= 10000) { energyScore += 15; energyEvidence.push("Meaningful monthly electricity bill disclosed"); }
  else if (bill > 0) { energyScore += 8; energyEvidence.push("Monthly electricity bill disclosed"); }
  if (truthy(lead.installationTimeline)) { energyScore += 5; energyEvidence.push("Installation timeline shared"); }
  if (!bill) missingEvidence.push("Recent electricity bill or bill range");
  if (!truthy(lead.installationTimeline)) missingEvidence.push("Project timing or survey readiness");
  dimensions.push({ id: "energy", label: "Energy and timing", score: energyScore, max: 20, evidence: energyEvidence });

  const controlEvidence: string[] = [];
  let controlScore = 0;
  const ownership = String(lead.homeownershipType || "").toLowerCase();
  if (ownership.includes("owner") || ownership.includes("owned")) { controlScore += 20; controlEvidence.push("Property ownership indicated"); }
  else if (ownership.includes("commercial")) { controlScore += 10; controlEvidence.push("Commercial property type indicated; ownership still needs confirmation"); missingEvidence.push("Building ownership or lease permission"); }
  else if (ownership.includes("tenant") || ownership.includes("rented")) { riskFlags.push("Tenant or rented property—rooftop permission must be confirmed"); missingEvidence.push("Written owner/lease permission for rooftop work"); }
  else { missingEvidence.push("Property ownership or rooftop permission"); }
  dimensions.push({ id: "control", label: "Site control", score: controlScore, max: 20, evidence: controlEvidence });

  const fitEvidence: string[] = [];
  let fitScore = 0;
  if (truthy(lead.company)) { fitScore += 5; fitEvidence.push("Company or facility name captured"); }
  const type = String(lead.businessType || "").toLowerCase();
  const highEnergyTypes = ["factory", "manufactur", "textile", "cold storage", "warehouse", "hospital", "hotel", "dairy", "mill", "processing", "pharma", "food"];
  if (highEnergyTypes.some(value => type.includes(value))) { fitScore += 7; fitEvidence.push("Energy-relevant facility type captured"); }
  else if (truthy(lead.businessType)) { fitScore += 3; fitEvidence.push("Facility type captured"); }
  if (String(lead.businessSize || "").toLowerCase() === "large") { fitScore += 3; fitEvidence.push("Large facility proxy captured"); }
  else if (String(lead.businessSize || "").toLowerCase() === "medium") { fitScore += 2; fitEvidence.push("Medium facility proxy captured"); }
  if (ownership.includes("commercial")) { fitScore += 3; fitEvidence.push("Commercial use indicated"); }
  fitScore = Math.min(15, fitScore);
  if (!truthy(lead.company)) missingEvidence.push("Company or facility name");
  dimensions.push({ id: "facility_fit", label: "Facility fit", score: fitScore, max: 15, evidence: fitEvidence });

  const engagementEvidence: string[] = [];
  let engagementScore = 0;
  const status = String(lead.status || "new").toLowerCase();
  if (["qualified", "converted"].includes(status)) { engagementScore = 10; engagementEvidence.push(`Lead status is ${status}`); }
  else if (status === "contacted") { engagementScore = 5; engagementEvidence.push("A contact attempt is recorded"); }
  dimensions.push({ id: "engagement", label: "Engagement", score: engagementScore, max: 10, evidence: engagementEvidence });

  if (isBlocked) riskFlags.push("Do-not-contact flag is active");
  const rawScore = dimensions.reduce((total, dimension) => total + dimension.score, 0);
  const evidenceCaptured = dimensions.reduce((count, dimension) => count + dimension.evidence.length, 0);
  const confidence = Math.min(100, Math.round((evidenceCaptured / 9) * 100));
  const score = isBlocked ? 0 : Math.min(100, rawScore);
  const tier = isBlocked
    ? "blocked"
    : score >= 80 ? "sales_ready"
    : score >= 65 ? "research_first"
    : score >= 45 ? "nurture"
    : "insufficient_evidence";
  const nextAction = isBlocked
    ? "Do not contact. Review consent or do-not-contact status before any action."
    : tier === "sales_ready"
      ? "Call the decision maker, request a recent bill, and offer a preliminary site survey."
      : tier === "research_first"
        ? "Verify property control and the decision maker before starting outreach."
        : tier === "nurture"
          ? "Research missing contact, property, and bill evidence before allocating outreach volume."
          : "Do not automate. Complete basic contact, location, and facility evidence first.";

  return { score, tier, confidence, dimensions, missingEvidence: Array.from(new Set(missingEvidence)), riskFlags: Array.from(new Set(riskFlags)), nextAction, scoringVersion: "evidence_v1" };
}

export function calculateBusinessEvidenceScore(business: Record<string, unknown>): LeadEvidenceScore {
  return calculateEvidenceScore({
    id: Number(business.id || 0),
    firstName: typeof business.ownerName === "string" ? business.ownerName : null,
    email: typeof business.email === "string" ? business.email : null,
    phone: typeof business.phone === "string" ? business.phone : null,
    company: typeof business.businessName === "string" ? business.businessName : null,
    businessType: typeof business.businessType === "string" ? business.businessType : null,
    businessSize: typeof business.businessSize === "string" ? business.businessSize : null,
    website: typeof business.website === "string" ? business.website : null,
    propertyAddress: typeof business.address === "string" ? business.address : null,
    city: typeof business.city === "string" ? business.city : null,
    state: typeof business.state === "string" ? business.state : null,
    source: typeof business.source === "string" ? business.source : "google_maps",
  });
}
