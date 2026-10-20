export const solarStages = [
  "awaiting_partner",
  "assigned",
  "accepted",
  "survey_booked",
  "survey_completed",
  "proposal_sent",
  "installed",
  "closed_won",
  "rejected",
  "cancelled",
] as const;
export type SolarStage = (typeof solarStages)[number];
const transitions: Record<SolarStage, readonly SolarStage[]> = {
  awaiting_partner: ["assigned", "cancelled"],
  assigned: ["accepted", "rejected", "cancelled"],
  accepted: ["survey_booked", "rejected", "cancelled"],
  survey_booked: ["accepted", "survey_completed", "cancelled"],
  survey_completed: ["proposal_sent", "rejected", "cancelled"],
  proposal_sent: ["installed", "rejected", "cancelled"],
  installed: ["closed_won"],
  closed_won: [],
  rejected: ["awaiting_partner"],
  cancelled: ["awaiting_partner"],
};
export function assertSolarTransition(from: SolarStage, to: SolarStage) {
  if (!transitions[from]?.includes(to))
    throw new Error(`Cannot move from ${from} to ${to}.`);
}
export function normalizeIndianPhone(value: string): string | null {
  const digits = value.replace(/[\s()+-]/g, "");
  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}
export function validSlot(start: string, end: string, now = Date.now()) {
  const a = Date.parse(start),
    b = Date.parse(end);
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    a > now &&
    b > a &&
    b - a <= 8 * 60 * 60 * 1000
  );
}
export function commissionFor(
  revenuePaise: number,
  model: string,
  rate: number | null
): number | null {
  if (model === "not_agreed" || rate == null) return null;
  if (
    !Number.isSafeInteger(revenuePaise) ||
    revenuePaise < 0 ||
    !Number.isFinite(rate) ||
    rate < 0
  )
    throw new Error("Invalid commercial amount.");
  if (model === "installation_percent") {
    if (rate > 100) throw new Error("Commission percentage cannot exceed 100.");
    return Math.round((revenuePaise * rate) / 100);
  }
  if (model === "accepted_lead" || model === "completed_survey")
    return Math.round(rate * 100);
  throw new Error("Unknown commercial model.");
}
