export type ChatPropertyType = "residential" | "commercial";

export type DeterministicChatFacts = {
  name?: string;
  city?: string;
  state?: string;
  monthlyBill?: number;
  propertyType?: ChatPropertyType;
  phone?: string;
  email?: string;
};

export type KnownChatFacts = {
  customerCity?: string | null;
  customerState?: string | null;
  monthlyBill?: string | number | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
};

const CITY_STATE: Array<{ city: string; state: string }> = [
  { city: "Hyderabad", state: "Telangana" },
  { city: "Secunderabad", state: "Telangana" },
  { city: "Warangal", state: "Telangana" },
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Maharashtra",
  "Kerala", "Gujarat", "Rajasthan", "Madhya Pradesh", "Uttar Pradesh",
  "West Bengal", "Delhi", "Haryana", "Punjab", "Odisha", "Bihar",
];

function parseMoney(text: string): number | undefined {
  const amountMatches = Array.from(text.matchAll(/(?:₹|rs\.?|inr)\s*([0-9][0-9,]{2,8})/gi));
  const contextualMatches = Array.from(text.matchAll(/(?:bill|electricity|monthly)\D{0,24}([0-9][0-9,]{2,8})/gi));
  const value = amountMatches.at(-1)?.[1] || contextualMatches.at(-1)?.[1];
  if (!value) return undefined;
  const amount = Number(value.replace(/,/g, ""));
  return Number.isFinite(amount) && amount >= 250 && amount <= 1_000_000 ? amount : undefined;
}

function parsePhone(text: string): string | undefined {
  const match = text.replace(/[()\s-]/g, "").match(/(?:\+?91)?([6-9]\d{9})\b/);
  return match?.[1];
}

function parseEmail(text: string): string | undefined {
  return text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0];
}

function parsePropertyType(text: string): ChatPropertyType | undefined {
  const lower = text.toLowerCase();
  if (/commercial|warehouse|factory|office|shop|business|industrial/.test(lower)) return "commercial";
  if (/residential|home|house|flat|villa|apartment|ghar/.test(lower)) return "residential";
  return undefined;
}

function parseName(text: string): string | undefined {
  const match = text.match(/\b(?:my name is|i am|i'm|this is)\s+([a-z][a-z .'-]{1,40})/i);
  if (!match?.[1]) return undefined;
  const name = match[1].replace(/\s+(?:and|from|with|in|my)\b.*$/i, "").trim();
  return /^[a-z][a-z .'-]{1,40}$/i.test(name) ? name : undefined;
}

function parseLocation(text: string): Pick<DeterministicChatFacts, "city" | "state"> {
  const lower = text.toLowerCase();
  const city = CITY_STATE.find(entry => lower.includes(entry.city.toLowerCase()));
  if (city) return { city: city.city, state: city.state };

  const state = INDIAN_STATES.find(candidate => lower.includes(candidate.toLowerCase()));
  return state ? { state } : {};
}

/**
 * Extracts only explicitly stated values or high-confidence city-to-state pairs.
 * It intentionally avoids model calls so captured facts survive provider delays.
 */
export function deriveDeterministicChatFacts(text: string, known: KnownChatFacts = {}): DeterministicChatFacts {
  const location = parseLocation(text);
  const monthlyBill = parseMoney(text) ?? (known.monthlyBill ? Number(known.monthlyBill) : undefined);
  return {
    name: parseName(text),
    city: location.city || known.customerCity || undefined,
    state: location.state || known.customerState || undefined,
    monthlyBill: Number.isFinite(monthlyBill) && monthlyBill && monthlyBill > 0 ? monthlyBill : undefined,
    propertyType: parsePropertyType(text),
    phone: parsePhone(text) || known.customerPhone || undefined,
    email: parseEmail(text) || known.customerEmail || undefined,
  };
}

export function hasEstimateInputs(facts: DeterministicChatFacts): facts is DeterministicChatFacts & Required<Pick<DeterministicChatFacts, "state" | "monthlyBill" | "propertyType">> {
  return Boolean(facts.state && facts.monthlyBill && facts.propertyType);
}

export function isCallbackRequest(text: string): boolean {
  return /\b(call me|callback|phone me|call tomorrow|speak with (?:a |the )?(?:person|consultant|team|agent))\b/i.test(text);
}

export function hasExplicitContactConsent(text: string): boolean {
  return /\b(?:i\s+)?(?:agree|consent)\b[^.]{0,100}\b(?:contact|callback|call|solar request|team)\b/i.test(text);
}

export function buildCallbackConsentPrompt(): string {
  return "Before we collect or use a phone number for a callback, please confirm that you agree to be contacted about this solar request. Once you agree, I’ll ask only for your preferred time and the contact detail still needed.";
}

export function buildSafeProviderFallback(facts: DeterministicChatFacts): string {
  const summary = [
    facts.city ? `${facts.city}${facts.state ? `, ${facts.state}` : ""}` : null,
    facts.propertyType,
    facts.monthlyBill ? `₹${Math.round(facts.monthlyBill).toLocaleString("en-IN")} monthly bill` : null,
  ].filter(Boolean).join(" · ");

  return summary
    ? `I’ve kept the details you shared: ${summary}. I can continue from this context when the response service is available; any subsidy, pricing, savings, tariff, warranty, or eligibility still needs configured data and site verification.`
    : "I couldn’t complete that response just now. I’ve kept the details you shared; please try again and I’ll continue without asking for the same information again.";
}

export function withProviderTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("provider_timeout")), timeoutMs);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

export function estimateCommercialCapacityKw(monthlyBill: number, averageElectricityRate: number, averageSunHours: number): number | null {
  if (!(monthlyBill > 0 && averageElectricityRate > 0 && averageSunHours > 0)) return null;
  const monthlyUnits = monthlyBill / averageElectricityRate;
  const systemSize = (monthlyUnits / 30 / averageSunHours) * 1.2;
  return Math.round(systemSize * 10) / 10;
}

export function estimateResidentialCapacityKw(monthlyBill: number, averageElectricityRate: number, averageSunHours: number): number | null {
  const size = estimateCommercialCapacityKw(monthlyBill, averageElectricityRate, averageSunHours);
  return size && size > 0 ? Math.max(1, size) : null;
}

export function buildLimitedResidentialEstimateResponse(facts: DeterministicChatFacts, systemSizeKw: number | null): string {
  const bill = facts.monthlyBill ? `₹${Math.round(facts.monthlyBill).toLocaleString("en-IN")}` : "the monthly bill";
  if (systemSizeKw && facts.state) {
    return `Based on your ${bill} monthly bill and the configured ${facts.state} tariff and generation inputs, a preliminary residential system size is around ${systemSizeKw} kW. I do not have a configured product catalog to quote cost, savings, or subsidy, so those remain subject to site assessment and eligibility review.`;
  }
  return "I’ve kept your residential location and bill details. I need configured local tariff and generation inputs before I can calculate even a preliminary system size; I will not guess costs, savings, or subsidy eligibility.";
}

export function buildCommercialEstimateResponse(facts: DeterministicChatFacts, commercialKw: number | null): string {
  const bill = facts.monthlyBill ? `₹${Math.round(facts.monthlyBill).toLocaleString("en-IN")}` : "the monthly bill";
  if (commercialKw && facts.state) {
    return `Based on the ${bill} monthly bill you shared for a commercial property in ${facts.state}, a preliminary system range is around ${commercialKw} kW. Residential subsidy is not assumed for commercial property; pricing, savings, tax treatment, and eligibility need a configured quote and site assessment.`;
  }
  return "I’ve kept your commercial-property, location, and bill details. I can’t produce a numerical commercial estimate until the configured local tariff and generation inputs are available; residential subsidy is not assumed for commercial property.";
}
