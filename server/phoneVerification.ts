import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { normalizeIndianPhone } from "../shared/solarWorkflow";
import { getPlatformSafetyControl } from "./platformCommunicationService";

const rows = (result: any): any[] =>
  Array.isArray(result?.[0]) ? result[0] : [];
export function phoneVerificationConfigured() {
  return (
    process.env.SOLAR_PHONE_VERIFICATION_ENABLED === "true" &&
    /^AC[\da-f]{32}$/i.test(process.env.TWILIO_ACCOUNT_SID || "") &&
    /^VA[\da-f]{32}$/i.test(process.env.TWILIO_VERIFY_SERVICE_SID || "") &&
    Boolean(process.env.TWILIO_AUTH_TOKEN)
  );
}
export async function callPhoneVerification(
  path: "Verifications" | "VerificationCheck",
  body: URLSearchParams
) {
  if (!phoneVerificationConfigured())
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Phone verification is not configured. Your enquiry can wait for an installer.",
    });
  const safety = await getPlatformSafetyControl();
  if (safety.emergencyStopActive)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Phone verification is temporarily paused.",
    });
  let response: globalThis.Response;
  try {
    response = await fetch(
      `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${path}`,
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message:
        "Verification service unavailable. Please wait before trying again.",
    });
  }
  if (!response.ok)
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message:
        "Verification could not be completed. Check the code or try again later.",
    });
  const data = await response.json();
  return { status: String(data.status || ""), to: String(data.to || "") };
}
export async function sendSolarOtp(sessionId: string, suppliedPhone: string) {
  if (!phoneVerificationConfigured())
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Phone verification is not configured yet.",
    });
  const phone = normalizeIndianPhone(suppliedPhone);
  if (!phone)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Enter a valid Indian mobile number.",
    });
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
  const identity = await db.transaction(async tx => {
    const current = rows(
      await tx.execute(
        sql`SELECT * FROM solarChatIdentity WHERE sessionId = ${sessionId} FOR UPDATE`
      )
    )[0];
    if (!current?.consentAt || current.revokedAt || current.phone !== phone)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message:
          "Agree to contact and provide this mobile number in chat first.",
      });
    const hash = createHash("sha256").update(phone).digest("hex");
    await tx.execute(
      sql`INSERT IGNORE INTO solarOtpLimits (phoneHash, windowStartedAt) VALUES (${hash}, UTC_TIMESTAMP())`
    );
    const limit = rows(
      await tx.execute(
        sql`SELECT * FROM solarOtpLimits WHERE phoneHash = ${hash} FOR UPDATE`
      )
    )[0];
    if (
      limit.lastRequestedAt &&
      Date.now() - new Date(limit.lastRequestedAt).getTime() < 60000
    )
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Wait one minute before requesting another code.",
      });
    const reset =
      Date.now() - new Date(limit.windowStartedAt).getTime() >= 3600000;
    if (!reset && Number(limit.requestCount) >= 5)
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many verification requests. Try again in an hour.",
      });
    await tx.execute(
      sql`UPDATE solarOtpLimits SET lastRequestedAt = UTC_TIMESTAMP(), requestCount = ${reset ? 1 : Number(limit.requestCount) + 1}, windowStartedAt = CASE WHEN ${reset} THEN UTC_TIMESTAMP() ELSE windowStartedAt END WHERE phoneHash = ${hash}`
    );
    await tx.execute(
      sql`UPDATE solarChatIdentity SET otpRequestedAt = UTC_TIMESTAMP(), otpAttempts = 0, otpGeneration = otpGeneration + 1, phoneVerifiedAt = NULL WHERE sessionId = ${sessionId}`
    );
    return { ...current, generation: Number(current.otpGeneration) + 1 };
  });
  const result = await callPhoneVerification(
    "Verifications",
    new URLSearchParams({ To: phone, Channel: "sms" })
  );
  if (result.status !== "pending" || result.to !== phone)
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "The provider did not confirm a verification request.",
    });
  return {
    success: true,
    message: "Verification code requested.",
    generation: identity.generation,
  };
}
export async function verifySolarOtp(sessionId: string, code: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
  const identity = await db.transaction(async tx => {
    const current = rows(
      await tx.execute(
        sql`SELECT * FROM solarChatIdentity WHERE sessionId = ${sessionId} FOR UPDATE`
      )
    )[0];
    if (
      !current?.consentAt ||
      current.revokedAt ||
      !current.phone ||
      !current.otpRequestedAt ||
      Date.now() - new Date(current.otpRequestedAt).getTime() > 10 * 60000
    )
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Request a new verification code.",
      });
    if (Number(current.otpAttempts) >= 5)
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many attempts. Request a new code later.",
      });
    await tx.execute(
      sql`UPDATE solarChatIdentity SET otpAttempts = otpAttempts + 1 WHERE sessionId = ${sessionId}`
    );
    return current;
  });
  const result = await callPhoneVerification(
    "VerificationCheck",
    new URLSearchParams({ To: identity.phone, Code: code })
  );
  if (result.status !== "approved" || result.to !== identity.phone)
    return {
      success: false,
      message: "Code not approved. Check the code and try again.",
    };
  const update: any = await db.execute(
    sql`UPDATE solarChatIdentity SET phoneVerifiedAt = NOW() WHERE sessionId = ${sessionId} AND phone = ${identity.phone} AND otpGeneration = ${identity.otpGeneration} AND revokedAt IS NULL`
  );
  if (!update[0]?.affectedRows)
    throw new TRPCError({
      code: "CONFLICT",
      message: "Your contact details changed. Please verify again.",
    });
  return { success: true, message: "Mobile number verified." };
}
