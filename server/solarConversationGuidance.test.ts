import { describe, expect, it } from "vitest";
import { buildSolarConversationGuidance, deriveSolarConversationState } from "./solarConversationGuidance";
import type { Message } from "./_core/llm";

const solarSystem: Message = {
  role: "system",
  content: "You are Agent Klaus from Sales Squad, a solar advisor. Use configured solar panels, inverter and subsidy data.",
};

describe("deriveSolarConversationState", () => {
  it("skips redundant questions when bill, location and property type arrive together", () => {
    const state = deriveSolarConversationState([
      solarSystem,
      { role: "user", content: "I have a residential house in Hyderabad and my electricity bill is ₹6500 per month. Give me an estimate." },
    ]);

    expect(state.intent).toBe("estimate");
    expect(state.propertyType).toBe("residential");
    expect(state.hasBill).toBe(true);
    expect(state.hasLocation).toBe(true);
    expect(state.nextBestAction).toContain("give the preliminary estimate first");
  });

  it("routes commercial customers away from residential assumptions", () => {
    const state = deriveSolarConversationState([
      solarSystem,
      { role: "user", content: "I run a warehouse and want commercial solar. Our monthly bill is ₹85000 in Hyderabad." },
    ]);

    expect(state.intent).toBe("commercial");
    expect(state.propertyType).toBe("commercial");
    expect(state.leadTemperature).toBe("warm");
  });

  it("detects objections without restarting qualification", () => {
    const state = deriveSolarConversationState([
      solarSystem,
      { role: "user", content: "My bill is ₹7000 in Hyderabad but solar looks too expensive. I need an estimate." },
    ]);

    expect(state.objection).toBe("price");
    expect(state.nextBestAction).toContain("price objection");
  });

  it("treats explicit human follow-up as hot intent", () => {
    const state = deriveSolarConversationState([
      solarSystem,
      { role: "user", content: "Call me tomorrow on 9876543210, I want to install solar soon." },
    ]);

    expect(state.intent).toBe("human");
    expect(state.hasContact).toBe(true);
    expect(state.leadTemperature).toBe("hot");
    expect(state.nextBestAction).toContain("do not ask for contact details again");
  });
});

describe("buildSolarConversationGuidance", () => {
  it("adds orchestration only to solar sales conversations", () => {
    const guidance = buildSolarConversationGuidance([
      solarSystem,
      { role: "user", content: "Check subsidy for my house in Hyderabad" },
    ]);

    expect(guidance).toContain("SMART CONVERSATION ORCHESTRATION");
    expect(guidance).toContain("Never re-ask a field");
    expect(guidance).toContain("Never invent subsidy amounts");
  });

  it("does not affect unrelated LLM calls", () => {
    const guidance = buildSolarConversationGuidance([
      { role: "system", content: "You are a general writing assistant." },
      { role: "user", content: "Rewrite this paragraph." },
    ]);

    expect(guidance).toBeNull();
  });
});
