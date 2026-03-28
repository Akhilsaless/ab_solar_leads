import { describe, it, expect } from "vitest";

// Test lead scoring from conversations
describe("AI Agent Lead Scoring", () => {
  function calculateLeadScore(conversation: any): number {
    let score = 50;

    if (conversation.monthlyEnergyBill) {
      const bill = parseFloat(conversation.monthlyEnergyBill);
      if (bill > 150) score += 20;
      else if (bill > 100) score += 15;
      else if (bill > 50) score += 10;
    }

    if (conversation.roofCondition === "excellent") score += 15;
    else if (conversation.roofCondition === "good") score += 10;
    else if (conversation.roofCondition === "fair") score += 5;

    if (conversation.sunExposure === "full") score += 15;
    else if (conversation.sunExposure === "partial") score += 8;

    if (conversation.installationTimeline === "immediate") score += 20;
    else if (conversation.installationTimeline === "3-6months") score += 15;
    else if (conversation.installationTimeline === "6-12months") score += 10;

    return Math.min(score, 100);
  }

  it("should calculate base score of 50 for empty conversation", () => {
    const score = calculateLeadScore({});
    expect(score).toBe(50);
  });

  it("should score high for qualified leads", () => {
    const score = calculateLeadScore({
      monthlyEnergyBill: 200,
      roofCondition: "excellent",
      sunExposure: "full",
      installationTimeline: "immediate",
    });
    expect(score).toBeGreaterThan(80);
  });

  it("should score low for unqualified leads", () => {
    const score = calculateLeadScore({
      monthlyEnergyBill: 30,
      roofCondition: "poor",
      sunExposure: "shaded",
      installationTimeline: "exploring",
    });
    expect(score).toBeLessThan(60);
  });
});

// Test lead data extraction
describe("Lead Data Extraction from Conversation", () => {
  function extractEmail(text: string): string | null {
    const match = text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    return match ? match[0] : null;
  }

  function extractPhone(text: string): string | null {
    const match = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
    return match ? match[0] : null;
  }

  function extractMonthlyBill(text: string): number | null {
    const match = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:per month|monthly|\/month)/i);
    return match ? parseFloat(match[1].replace(/,/g, "")) : null;
  }

  it("should extract email from text", () => {
    const email = extractEmail("My email is john@example.com for contact");
    expect(email).toBe("john@example.com");
  });

  it("should extract phone number from text", () => {
    const phone = extractPhone("You can reach me at 555-123-4567");
    expect(phone).toBe("555-123-4567");
  });

  it("should extract monthly energy bill", () => {
    const bill = extractMonthlyBill("My monthly bill is $150 per month");
    expect(bill).toBe(150);
  });

  it("should handle formatted numbers", () => {
    const bill = extractMonthlyBill("I pay $1,250.50 monthly");
    expect(bill).toBe(1250.50);
  });

  it("should return null for missing data", () => {
    expect(extractEmail("no email here")).toBeNull();
    expect(extractPhone("no phone here")).toBeNull();
    expect(extractMonthlyBill("no bill mentioned")).toBeNull();
  });
});

// Test priority assignment
describe("Lead Priority from Score", () => {
  function getPriority(score: number): string {
    if (score > 70) return "high";
    if (score > 40) return "medium";
    return "low";
  }

  it("should assign high priority for score > 70", () => {
    expect(getPriority(75)).toBe("high");
    expect(getPriority(100)).toBe("high");
  });

  it("should assign medium priority for score 40-70", () => {
    expect(getPriority(50)).toBe("medium");
    expect(getPriority(70)).toBe("medium");
  });

  it("should assign low priority for score <= 40", () => {
    expect(getPriority(40)).toBe("low");
    expect(getPriority(30)).toBe("low");
  });
});

// Test estimated savings calculation
describe("Estimated Savings Calculation", () => {
  function calculateEstimatedSavings(monthlyBill?: number): number {
    if (!monthlyBill) return 0;
    return Math.round(monthlyBill * 12 * 0.3); // 30% annual savings
  }

  it("should calculate zero savings for no bill", () => {
    expect(calculateEstimatedSavings()).toBe(0);
    expect(calculateEstimatedSavings(0)).toBe(0);
  });

  it("should calculate 30% annual savings", () => {
    const savings = calculateEstimatedSavings(100);
    expect(savings).toBe(360); // 100 * 12 * 0.3
  });

  it("should calculate realistic savings for typical homeowner", () => {
    const savings = calculateEstimatedSavings(150);
    expect(savings).toBe(540); // 150 * 12 * 0.3
  });

  it("should calculate savings for high energy consumer", () => {
    const savings = calculateEstimatedSavings(250);
    expect(savings).toBe(900); // 250 * 12 * 0.3
  });
});

// Test conversation status flow
describe("Conversation Status Workflow", () => {
  const validTransitions: Record<string, string[]> = {
    active: ["completed", "handed_off"],
    completed: [],
    handed_off: [],
  };

  it("should allow valid status transitions", () => {
    expect(validTransitions["active"]).toContain("completed");
    expect(validTransitions["active"]).toContain("handed_off");
  });

  it("should prevent transitions from terminal states", () => {
    expect(validTransitions["completed"]).toHaveLength(0);
    expect(validTransitions["handed_off"]).toHaveLength(0);
  });
});

// Test roof condition classification
describe("Roof Condition Classification", () => {
  function classifyRoofCondition(text: string): string {
    if (/excellent|great|perfect|new/i.test(text)) return "excellent";
    if (/good|fine|okay|well-maintained/i.test(text)) return "good";
    if (/fair|okay|average|aging/i.test(text)) return "fair";
    if (/poor|bad|old|deteriorating/i.test(text)) return "poor";
    return "unknown";
  }

  it("should classify excellent roofs", () => {
    expect(classifyRoofCondition("My roof is in excellent condition")).toBe("excellent");
    expect(classifyRoofCondition("We just replaced the roof, it's perfect")).toBe("excellent");
  });

  it("should classify good roofs", () => {
    expect(classifyRoofCondition("The roof is in good shape")).toBe("good");
    expect(classifyRoofCondition("It's well-maintained")).toBe("good");
  });

  it("should classify fair roofs", () => {
    expect(classifyRoofCondition("The roof is aging")).toBe("fair");
  });

  it("should classify poor roofs", () => {
    expect(classifyRoofCondition("The roof is in poor condition")).toBe("poor");
    expect(classifyRoofCondition("It's quite old and deteriorating")).toBe("poor");
  });

  it("should return unknown for unclassified text", () => {
    expect(classifyRoofCondition("I don't know about the roof")).toBe("unknown");
  });
});

// Test sun exposure classification
describe("Sun Exposure Classification", () => {
  function classifySunExposure(text: string): string {
    if (/full sun|lots of sun|sunny|no shade|direct sun/i.test(text)) return "full";
    if (/partial|some sun|partly|mixed/i.test(text)) return "partial";
    if (/shaded|shade|trees|buildings/i.test(text)) return "shaded";
    return "unknown";
  }

  it("should classify full sun exposure", () => {
    expect(classifySunExposure("My roof gets full sun all day")).toBe("full");
  });

  it("should classify partial sun exposure", () => {
    expect(classifySunExposure("There's some partial sun from trees")).toBe("partial");
  });

  it("should classify shaded exposure", () => {
    expect(classifySunExposure("My roof is mostly shaded")).toBe("shaded");
  });
});

// Test installation timeline classification
describe("Installation Timeline Classification", () => {
  function classifyTimeline(text: string): string {
    if (/immediate|asap|now|right away|next month/i.test(text)) return "immediate";
    if (/3.*6|three.*six|months|quarter/i.test(text)) return "3-6months";
    if (/6.*12|six.*twelve|year/i.test(text)) return "6-12months";
    if (/exploring|considering|thinking|maybe/i.test(text)) return "exploring";
    return "unknown";
  }

  it("should classify immediate timeline", () => {
    expect(classifyTimeline("I want to install solar ASAP")).toBe("immediate");
  });

  it("should classify 3-6 month timeline", () => {
    expect(classifyTimeline("We're thinking 3 to 6 months")).toBe("3-6months");
  });

  it("should classify exploring timeline", () => {
    expect(classifyTimeline("We're just exploring options")).toBe("exploring");
  });
});
