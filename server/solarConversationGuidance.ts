import type { Message } from "./_core/llm";

type SolarIntent = "estimate" | "subsidy" | "commercial" | "site_visit" | "human" | "general";
type LeadTemperature = "hot" | "warm" | "cold";

export type SolarConversationState = {
  intent: SolarIntent;
  propertyType?: "residential" | "commercial";
  hasBill: boolean;
  hasLocation: boolean;
  hasName: boolean;
  hasContact: boolean;
  objection?: "price" | "trust" | "timing" | "roof" | "renting";
  leadTemperature: LeadTemperature;
  language: "english" | "hindi" | "telugu" | "mixed";
  nextBestAction: string;
};

function asText(content: Message["content"]): string {
  if (typeof content === "string") return content;
  const parts = Array.isArray(content) ? content : [content];
  return parts.map(part => {
    if (typeof part === "string") return part;
    return part.type === "text" ? part.text : "";
  }).filter(Boolean).join(" ");
}

function customerText(messages: Message[]) {
  return messages.filter(m => m.role === "user").map(m => asText(m.content)).join("\n");
}

function inferIntent(text: string): SolarIntent {
  const lc = text.toLowerCase();
  if (/commercial|factory|warehouse|office|shop|business|industrial|3[- ]?phase/.test(lc)) return "commercial";
  if (/site visit|survey|inspection|visit my|book.*visit|come.*property/.test(lc)) return "site_visit";
  if (/human|person|consultant|agent|call me|callback|phone me|whatsapp me/.test(lc)) return "human";
  if (/subsid|pm surya|government scheme|govt scheme/.test(lc)) return "subsidy";
  if (/estimate|saving|how much|cost|price|bill|kw|solar system/.test(lc)) return "estimate";
  return "general";
}

function inferLanguage(text: string): SolarConversationState["language"] {
  if (/[ఀ-౿]/.test(text)) return "telugu";
  if (/[ऀ-ॿ]/.test(text)) return "hindi";
  if (/\b(kya|hai|mera|mujhe|kitna|chahiye|karna|bill hai|ghar|solar lagana)\b/i.test(text)) return "mixed";
  return "english";
}

function inferObjection(text: string): SolarConversationState["objection"] {
  const lc = text.toLowerCase();
  if (/too expensive|costly|afford|budget|price is high|bahut mehenga/.test(lc)) return "price";
  if (/scam|fake|don't trust|do not trust|is this real|subsidy.*true/.test(lc)) return "trust";
  if (/later|think about|not now|next year|some other time/.test(lc)) return "timing";
  if (/small roof|no roof|roof.*small|shadow|shading/.test(lc)) return "roof";
  if (/rent|tenant|landlord|not my property/.test(lc)) return "renting";
  return undefined;
}

function hasPhone(text: string) {
  return /(?:\+?91[-\s]?)?[6-9]\d{9}\b/.test(text.replace(/[()]/g, ""));
}

function hasEmail(text: string) {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
}

function hasBill(text: string) {
  return /(?:₹|rs\.?|inr)?\s*\d{3,6}\s*(?:\/\s*month|per month|monthly|bill)?/i.test(text) && /bill|electricity|units|kwh|₹|rs\.?|inr/i.test(text);
}

function hasLocation(text: string) {
  return /\b(?:hyderabad|secunderabad|bengaluru|bangalore|chennai|mumbai|pune|delhi|gurugram|gurgaon|noida|kolkata|ahmedabad|jaipur|kochi|vijayawada|visakhapatnam|warangal|telangana|andhra pradesh|karnataka|tamil nadu|maharashtra|kerala|rajasthan|gujarat)\b/i.test(text) || /\b[1-9][0-9]{5}\b/.test(text);
}

function hasName(text: string) {
  return /\b(?:my name is|i am|i'm|this is|call me)\s+[a-z][a-z .'-]{1,40}\b/i.test(text);
}

function leadTemperature(text: string, intent: SolarIntent, contact: boolean): LeadTemperature {
  const lc = text.toLowerCase();
  if (contact || intent === "site_visit" || /install.*(?:now|soon|month)|ready to|book|call me|whatsapp me/.test(lc)) return "hot";
  if (intent === "estimate" || intent === "subsidy" || intent === "commercial") return "warm";
  return "cold";
}

export function deriveSolarConversationState(messages: Message[]): SolarConversationState {
  const text = customerText(messages);
  const intent = inferIntent(text);
  const propertyType = /commercial|factory|warehouse|office|shop|business|industrial/.test(text.toLowerCase())
    ? "commercial"
    : /residential|home|house|flat|villa|apartment|ghar/.test(text.toLowerCase())
      ? "residential"
      : undefined;
  const contact = hasPhone(text) || hasEmail(text);
  const state: SolarConversationState = {
    intent,
    propertyType,
    hasBill: hasBill(text),
    hasLocation: hasLocation(text),
    hasName: hasName(text),
    hasContact: contact,
    objection: inferObjection(text),
    leadTemperature: leadTemperature(text, intent, contact),
    language: inferLanguage(text),
    nextBestAction: "answer the customer's question directly",
  };

  if (intent === "estimate" || intent === "commercial") {
    if (!state.propertyType) state.nextBestAction = "ask whether the property is residential or commercial";
    else if (!state.hasBill) state.nextBestAction = "ask for the approximate monthly electricity bill or units; offer bill upload as optional convenience";
    else if (!state.hasLocation) state.nextBestAction = "ask only for city or PIN code, not a full address";
    else state.nextBestAction = "give the preliminary estimate first, explain uncertainty, then offer WhatsApp, site visit, or continued chat";
  } else if (intent === "subsidy") {
    state.nextBestAction = state.hasLocation
      ? "explain only subsidy information supported by configured data and clearly state eligibility conditions"
      : "ask for city/state or PIN only if location is required to determine subsidy eligibility";
  } else if (intent === "site_visit" || intent === "human") {
    state.nextBestAction = state.hasContact
      ? "confirm the requested handoff and do not ask for contact details again"
      : "ask for one preferred contact method and obtain consent at this point";
  }

  if (state.objection) {
    state.nextBestAction = `address the ${state.objection} objection briefly with evidence and uncertainty, then continue from the customer's original intent without restarting qualification`;
  }

  return state;
}

export function buildSolarConversationGuidance(messages: Message[]): string | null {
  const system = messages.find(m => m.role === "system");
  const systemText = system ? asText(system.content).toLowerCase() : "";
  const looksLikeSolarSales = /solar/.test(systemText) && /(sales squad|agent klaus|subsid|panel|inverter|electricity)/.test(systemText);
  if (!looksLikeSolarSales) return null;

  const state = deriveSolarConversationState(messages);
  return `\n\n=== SMART CONVERSATION ORCHESTRATION (HIGH PRIORITY) ===
Treat this as a natural AI sales consultation, not a fixed questionnaire.
Current inferred state: ${JSON.stringify(state)}

Rules:
1. Use ALL facts already present in the conversation. Never re-ask a field the customer already supplied, even if several facts were supplied in one sentence.
2. Follow the customer's latest intent immediately. If they switch from estimate to subsidy, commercial solar, an objection, or human help, switch with them; never force the old funnel.
3. Give value before identity capture. Do not ask name/phone/email merely to answer questions or provide a preliminary estimate.
4. Ask at most ONE missing qualification question at a time, choosing the question that most improves the next answer.
5. For location, prefer city or PIN. Ask for full address/GPS only when a site visit truly needs it.
6. For contact capture, ask only after the customer requests WhatsApp, callback, site visit, detailed delivery, or clearly wants human follow-up. Respect consent and never ask for a contact detail already known.
7. Residential and commercial flows are different. Never apply residential subsidy assumptions to commercial customers.
8. Handle objections directly and briefly. Do not respond to objections with another generic pitch.
9. Never invent subsidy amounts, tariff rules, warranties, product availability, installation timelines, savings, or prices. If configured data is missing or uncertain, say what is known and what must be verified.
10. Estimates are preliminary. Use ranges or qualified language when inputs/site conditions are incomplete. Do not create fake precision.
11. Match the customer's language naturally (English, Hindi, Telugu, or mixed usage) while keeping financial figures clear.
12. Keep replies concise and conversational. Normally 2–5 short sentences, followed by no more than 3 useful quick replies when appropriate.
13. Do not expose OTP or claim phone verification is available unless a verified provider is actually configured.
14. Never restart the conversation or repeat the opening pitch for a returning customer.
15. Your next best action is: ${state.nextBestAction}.
=== END SMART ORCHESTRATION ===`;
}
