import { describe, expect, it } from "vitest";
import { parseQuickReplyMarkup, shouldUseLocalWelcome } from "../shared/chatControls";

describe("chat control markup", () => {
  it("converts valid quick-reply markup into buttons and removes control text", () => {
    const result = parseQuickReplyMarkup("Ready for a preliminary estimate.\n[QUICK_REPLIES]\n[\"Show estimate\", \"Talk to a person\"]\n[/QUICK_REPLIES]");

    expect(result.content).toBe("Ready for a preliminary estimate.");
    expect(result.quickReplies).toEqual(["Show estimate", "Talk to a person"]);
  });

  it("strips malformed and orphan quick-reply control markup from visible text", () => {
    const result = parseQuickReplyMarkup("Hello\n[QUICK_REPLIES]\n[\"Broken\"]\n[/QUICK_REPLIES]\n[/QUICK_REPLIES]");

    expect(result.content).not.toContain("QUICK_REPLIES");
  });

  it("does not create a duplicate local welcome for returning sessions", () => {
    expect(shouldUseLocalWelcome(0)).toBe(true);
    expect(shouldUseLocalWelcome(1)).toBe(false);
    expect(shouldUseLocalWelcome(4)).toBe(false);
  });
});
