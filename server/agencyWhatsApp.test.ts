import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validWhatsAppSignature, messageStatusRank } from "./agencyWhatsApp";
describe("WhatsApp callback authenticity and delivery semantics", () => {
  it("accepts only the exact signed raw body", () => {
    const raw = Buffer.from('{"entry":[]}'),
      secret = "synthetic-app-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    expect(validWhatsAppSignature(raw, signature, secret)).toBe(true);
    expect(
      validWhatsAppSignature(Buffer.from('{ "entry":[] }'), signature, secret)
    ).toBe(false);
    expect(validWhatsAppSignature(raw, signature, "wrong")).toBe(false);
    expect(validWhatsAppSignature(raw, "sha256=nope", secret)).toBe(false);
  });
  it("distinguishes provider acceptance from delivery and read receipt", () => {
    expect(messageStatusRank("accepted")).toBeLessThan(
      messageStatusRank("delivered")
    );
    expect(messageStatusRank("delivered")).toBeLessThan(
      messageStatusRank("read")
    );
    expect(messageStatusRank("nonsense")).toBe(-1);
  });
});
