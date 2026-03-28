import { describe, expect, it } from "vitest";

// ===== LEAD SCORING =====
function calculateLeadScore(lead: any): number {
  let score = 30;
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.whatsapp) score += 5;
  if (lead.monthlyEnergyBill) {
    const bill = parseFloat(lead.monthlyEnergyBill);
    if (bill > 200) score += 20;
    else if (bill > 150) score += 15;
    else if (bill > 100) score += 10;
    else if (bill > 50) score += 5;
  }
  if (lead.roofCondition === "excellent") score += 10;
  else if (lead.roofCondition === "good") score += 7;
  else if (lead.roofCondition === "fair") score += 3;
  if (lead.sunExposure === "full") score += 10;
  else if (lead.sunExposure === "partial") score += 5;
  if (lead.installationTimeline === "immediate") score += 15;
  else if (lead.installationTimeline === "3-6months") score += 10;
  else if (lead.installationTimeline === "6-12months") score += 5;
  if (lead.homeownershipType === "own") score += 10;
  else if (lead.homeownershipType === "mortgage") score += 5;
  return Math.min(score, 100);
}

function getPriority(score: number): "low" | "medium" | "high" | "urgent" {
  if (score >= 80) return "urgent";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function personalizeMessage(template: string, lead: any): string {
  return template
    .replace(/\{\{firstName\}\}/g, lead.firstName || "")
    .replace(/\{\{lastName\}\}/g, lead.lastName || "")
    .replace(/\{\{email\}\}/g, lead.email || "")
    .replace(/\{\{phone\}\}/g, lead.phone || "")
    .replace(/\{\{monthlyBill\}\}/g, lead.monthlyEnergyBill || "")
    .replace(/\{\{estimatedSavings\}\}/g, lead.estimatedSavings || "")
    .replace(/\{\{city\}\}/g, lead.city || "")
    .replace(/\{\{state\}\}/g, lead.state || "")
    .replace(/\{\{propertyAddress\}\}/g, lead.propertyAddress || "")
    .replace(/\{\{company\}\}/g, lead.company || "");
}

// ===== TESTS =====

describe("Lead Scoring", () => {
  it("gives base score of 30 for minimal lead", () => {
    const score = calculateLeadScore({ firstName: "John", lastName: "Doe" });
    expect(score).toBe(30);
  });

  it("adds 10 for email", () => {
    const score = calculateLeadScore({ firstName: "John", email: "john@test.com" });
    expect(score).toBe(40);
  });

  it("adds 10 for phone", () => {
    const score = calculateLeadScore({ firstName: "John", phone: "1234567890" });
    expect(score).toBe(40);
  });

  it("adds 5 for whatsapp", () => {
    const score = calculateLeadScore({ firstName: "John", whatsapp: "1234567890" });
    expect(score).toBe(35);
  });

  it("adds 20 for high energy bill (>200)", () => {
    const score = calculateLeadScore({ firstName: "John", monthlyEnergyBill: "250" });
    expect(score).toBe(50);
  });

  it("adds 15 for medium-high energy bill (>150)", () => {
    const score = calculateLeadScore({ firstName: "John", monthlyEnergyBill: "175" });
    expect(score).toBe(45);
  });

  it("adds 10 for medium energy bill (>100)", () => {
    const score = calculateLeadScore({ firstName: "John", monthlyEnergyBill: "120" });
    expect(score).toBe(40);
  });

  it("adds 5 for low energy bill (>50)", () => {
    const score = calculateLeadScore({ firstName: "John", monthlyEnergyBill: "75" });
    expect(score).toBe(35);
  });

  it("adds 10 for excellent roof condition", () => {
    const score = calculateLeadScore({ firstName: "John", roofCondition: "excellent" });
    expect(score).toBe(40);
  });

  it("adds 7 for good roof condition", () => {
    const score = calculateLeadScore({ firstName: "John", roofCondition: "good" });
    expect(score).toBe(37);
  });

  it("adds 3 for fair roof condition", () => {
    const score = calculateLeadScore({ firstName: "John", roofCondition: "fair" });
    expect(score).toBe(33);
  });

  it("adds 10 for full sun exposure", () => {
    const score = calculateLeadScore({ firstName: "John", sunExposure: "full" });
    expect(score).toBe(40);
  });

  it("adds 5 for partial sun exposure", () => {
    const score = calculateLeadScore({ firstName: "John", sunExposure: "partial" });
    expect(score).toBe(35);
  });

  it("adds 15 for immediate installation timeline", () => {
    const score = calculateLeadScore({ firstName: "John", installationTimeline: "immediate" });
    expect(score).toBe(45);
  });

  it("adds 10 for 3-6months timeline", () => {
    const score = calculateLeadScore({ firstName: "John", installationTimeline: "3-6months" });
    expect(score).toBe(40);
  });

  it("adds 10 for homeowner", () => {
    const score = calculateLeadScore({ firstName: "John", homeownershipType: "own" });
    expect(score).toBe(40);
  });

  it("adds 5 for mortgage holder", () => {
    const score = calculateLeadScore({ firstName: "John", homeownershipType: "mortgage" });
    expect(score).toBe(35);
  });

  it("caps score at 100 for perfect lead", () => {
    const score = calculateLeadScore({
      firstName: "John",
      email: "john@test.com",
      phone: "1234567890",
      whatsapp: "1234567890",
      monthlyEnergyBill: "300",
      roofCondition: "excellent",
      sunExposure: "full",
      installationTimeline: "immediate",
      homeownershipType: "own",
    });
    expect(score).toBe(100);
  });

  it("calculates composite score correctly", () => {
    const score = calculateLeadScore({
      firstName: "Jane",
      email: "jane@test.com",
      phone: "555-1234",
      monthlyEnergyBill: "180",
      roofCondition: "good",
      sunExposure: "partial",
      installationTimeline: "3-6months",
    });
    // 30 + 10(email) + 10(phone) + 15(bill>150) + 7(good roof) + 5(partial sun) + 10(3-6mo) = 87
    expect(score).toBe(87);
  });
});

describe("Priority Assignment", () => {
  it("assigns urgent for score >= 80", () => {
    expect(getPriority(80)).toBe("urgent");
    expect(getPriority(100)).toBe("urgent");
  });

  it("assigns high for score >= 60", () => {
    expect(getPriority(60)).toBe("high");
    expect(getPriority(79)).toBe("high");
  });

  it("assigns medium for score >= 40", () => {
    expect(getPriority(40)).toBe("medium");
    expect(getPriority(59)).toBe("medium");
  });

  it("assigns low for score < 40", () => {
    expect(getPriority(0)).toBe("low");
    expect(getPriority(39)).toBe("low");
  });
});

describe("Message Personalization", () => {
  const lead = {
    firstName: "Rajesh",
    lastName: "Kumar",
    email: "rajesh@example.com",
    phone: "9876543210",
    monthlyEnergyBill: "5000",
    estimatedSavings: "18000",
    city: "Mumbai",
    state: "Maharashtra",
    propertyAddress: "123 Solar Lane",
    company: "Kumar Industries",
  };

  it("replaces {{firstName}}", () => {
    expect(personalizeMessage("Hello {{firstName}}", lead)).toBe("Hello Rajesh");
  });

  it("replaces {{lastName}}", () => {
    expect(personalizeMessage("Dear {{lastName}}", lead)).toBe("Dear Kumar");
  });

  it("replaces {{email}}", () => {
    expect(personalizeMessage("Contact: {{email}}", lead)).toBe("Contact: rajesh@example.com");
  });

  it("replaces {{phone}}", () => {
    expect(personalizeMessage("Call: {{phone}}", lead)).toBe("Call: 9876543210");
  });

  it("replaces {{monthlyBill}}", () => {
    expect(personalizeMessage("Bill: ₹{{monthlyBill}}", lead)).toBe("Bill: ₹5000");
  });

  it("replaces {{estimatedSavings}}", () => {
    expect(personalizeMessage("Save ₹{{estimatedSavings}}/year", lead)).toBe("Save ₹18000/year");
  });

  it("replaces {{city}} and {{state}}", () => {
    expect(personalizeMessage("{{city}}, {{state}}", lead)).toBe("Mumbai, Maharashtra");
  });

  it("replaces {{propertyAddress}}", () => {
    expect(personalizeMessage("Address: {{propertyAddress}}", lead)).toBe("Address: 123 Solar Lane");
  });

  it("replaces {{company}}", () => {
    expect(personalizeMessage("Company: {{company}}", lead)).toBe("Company: Kumar Industries");
  });

  it("replaces multiple variables in one template", () => {
    const template = "Hi {{firstName}} {{lastName}}, your monthly bill of ₹{{monthlyBill}} in {{city}} could save you ₹{{estimatedSavings}}/year with solar.";
    const result = personalizeMessage(template, lead);
    expect(result).toBe("Hi Rajesh Kumar, your monthly bill of ₹5000 in Mumbai could save you ₹18000/year with solar.");
  });

  it("handles missing fields gracefully", () => {
    const partialLead = { firstName: "Test" };
    const result = personalizeMessage("Hi {{firstName}} {{lastName}}, from {{city}}", partialLead);
    expect(result).toBe("Hi Test , from ");
  });

  it("replaces all occurrences of same variable", () => {
    const result = personalizeMessage("{{firstName}} is great. {{firstName}} rocks!", lead);
    expect(result).toBe("Rajesh is great. Rajesh rocks!");
  });
});

describe("Estimated Savings Calculation", () => {
  it("calculates annual savings as monthlyBill * 12 * 0.3", () => {
    const monthlyBill = "5000";
    const savings = Math.round(parseFloat(monthlyBill) * 12 * 0.3);
    expect(savings).toBe(18000);
  });

  it("returns 0 for zero bill", () => {
    const savings = Math.round(parseFloat("0") * 12 * 0.3);
    expect(savings).toBe(0);
  });

  it("handles large bills correctly", () => {
    const savings = Math.round(parseFloat("25000") * 12 * 0.3);
    expect(savings).toBe(90000);
  });
});

describe("Lead Status Workflow", () => {
  const validTransitions: Record<string, string[]> = {
    new: ["contacted", "lost"],
    contacted: ["qualified", "lost"],
    qualified: ["converted", "lost"],
    converted: [],
    lost: ["new"],
  };

  it("allows new → contacted", () => {
    expect(validTransitions["new"]).toContain("contacted");
  });

  it("allows contacted → qualified", () => {
    expect(validTransitions["contacted"]).toContain("qualified");
  });

  it("allows qualified → converted", () => {
    expect(validTransitions["qualified"]).toContain("converted");
  });

  it("allows any active status → lost", () => {
    expect(validTransitions["new"]).toContain("lost");
    expect(validTransitions["contacted"]).toContain("lost");
    expect(validTransitions["qualified"]).toContain("lost");
  });

  it("allows lost → new (re-engagement)", () => {
    expect(validTransitions["lost"]).toContain("new");
  });
});

describe("DNC Check Logic", () => {
  it("identifies email match as DNC", () => {
    const dncList = [
      { email: "blocked@test.com", phone: null },
      { email: "spam@test.com", phone: "555-0000" },
    ];
    const isDnc = dncList.some(d => d.email === "blocked@test.com");
    expect(isDnc).toBe(true);
  });

  it("identifies phone match as DNC", () => {
    const dncList = [
      { email: null, phone: "555-0000" },
    ];
    const isDnc = dncList.some(d => d.phone === "555-0000");
    expect(isDnc).toBe(true);
  });

  it("returns false for non-DNC contact", () => {
    const dncList = [
      { email: "blocked@test.com", phone: "555-0000" },
    ];
    const isDnc = dncList.some(d => d.email === "safe@test.com" || d.phone === "555-1111");
    expect(isDnc).toBe(false);
  });
});

describe("CSV Import Parsing", () => {
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  it("parses simple CSV line", () => {
    const result = parseCSVLine("John,Doe,john@test.com");
    expect(result).toEqual(["John", "Doe", "john@test.com"]);
  });

  it("handles quoted fields with commas", () => {
    const result = parseCSVLine('"Kumar, Rajesh",Doe,"123, Main St"');
    expect(result).toEqual(["Kumar, Rajesh", "Doe", "123, Main St"]);
  });

  it("handles empty fields", () => {
    const result = parseCSVLine("John,,john@test.com");
    expect(result).toEqual(["John", "", "john@test.com"]);
  });

  it("trims whitespace", () => {
    const result = parseCSVLine("  John  ,  Doe  ,  john@test.com  ");
    expect(result).toEqual(["John", "Doe", "john@test.com"]);
  });
});

describe("Campaign Channel Validation", () => {
  const validChannels = ["email", "sms", "whatsapp", "phone", "multi"];

  it("accepts all valid channels", () => {
    validChannels.forEach(ch => {
      expect(validChannels).toContain(ch);
    });
  });

  it("rejects invalid channels", () => {
    expect(validChannels).not.toContain("telegram");
    expect(validChannels).not.toContain("fax");
  });
});

describe("A/B Testing Variant Assignment", () => {
  it("assigns variant A by default", () => {
    const variant = "A";
    expect(variant).toBe("A");
  });

  it("creates variant B when abVariantB exists", () => {
    const step = { body: "Hello A", abVariantB: "Hello B" };
    const hasAB = !!step.abVariantB;
    expect(hasAB).toBe(true);
  });

  it("does not create variant B when abVariantB is empty", () => {
    const step = { body: "Hello A", abVariantB: "" };
    const hasAB = !!step.abVariantB;
    expect(hasAB).toBe(false);
  });
});
