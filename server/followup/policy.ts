import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function secretEqual(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest()
  );
}
export const configSchema = z.object({
  voiceKey: z.string().min(8).max(2000).optional(),
  documentKey: z.string().min(8).max(2000).optional(),
  intakeToken: z.string().min(32).max(200).optional(),
  voiceToolToken: z.string().min(32).max(200).optional(),
  metaAppSecret: z.string().min(16).max(200).optional(),
  metaPageToken: z.string().min(20).max(2000).optional(),
  metaVerifyToken: z.string().min(32).max(200).optional(),
  metaPageId: z.union([z.literal(""), z.string().regex(/^\d+$/)]).optional(),
  metaConsentField: z.string().max(100).default("callback_consent"),
  metaConsentText: z.string().max(2000).default(""),
  graphVersion: z
    .string()
    .regex(/^v\d{1,3}\.\d$/)
    .default("v24.0"),
  orgId: z
    .union([z.literal(""), z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)])
    .default(""),
  workspaceId: z
    .union([z.literal(""), z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)])
    .default(""),
  appId: z
    .union([z.literal(""), z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)])
    .default(""),
  appVersion: z.number().int().positive().default(1),
  connectionId: z
    .union([z.literal(""), z.string().regex(/^[A-Za-z0-9_-]{1,100}$/)])
    .default(""),
  agentPhone: z
    .string()
    .regex(/^\+91\d{10}$/)
    .default("+910000000000"),
  maxCallSeconds: z.number().int().min(60).max(300).default(180),
  callRatePaise: z.number().int().min(1).max(10000).default(800),
  billPricePaise: z.number().int().min(1).max(10000).default(200),
  messagePricePaise: z.number().int().min(1).max(1000).default(150),
  maxAttempts: z.number().int().min(1).max(3).default(2),
  minimumBill: z.number().min(0).max(100000).default(2000),
  servicePincodes: z
    .array(z.string().regex(/^\d{6}$/))
    .max(1000)
    .default([]),
  automaticCalls: z.boolean().default(false),
  automaticRouting: z.boolean().default(false),
  routingPartnerIds: z.array(z.number().int().positive()).max(100).default([]),
  providerDurationConfirmed: z.boolean().default(false),
  consentPolicyConfirmed: z.boolean().default(false),
});
export type FollowupConfig = z.infer<typeof configSchema>;
export function qualification(input: any, config: FollowupConfig) {
  const bill = Number(input.monthly_bill);
  return (
    Number.isFinite(bill) &&
    bill >= config.minimumBill &&
    input.roof_owner === true &&
    input.survey_requested === true &&
    config.servicePincodes.includes(String(input.pincode))
  );
}
export function callCharge(seconds: number, rate: number) {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    !Number.isSafeInteger(rate) ||
    rate < 1
  )
    throw new Error("invalid_usage");
  return Math.ceil(seconds / 60) * rate;
}
export function insideCallingHours(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date)
  );
  return hour >= 9 && hour < 20;
}
export const billSchema = z.object({
  amount: z.number().min(0).max(10000000).nullable(),
  units: z.number().min(0).max(10000000).nullable(),
  consumer_number: z.string().max(100).nullable(),
  sanctioned_load_kw: z.number().min(0).max(100000).nullable(),
  discom: z.string().max(100).nullable(),
});
