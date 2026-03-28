import { describe, expect, it } from "vitest";

// ===== BUSINESS SIZE CLASSIFICATION =====
function classifyBusinessSize(reviewCount: number, types: string[]): "small" | "medium" | "large" {
  const largeTypes = ["hospital", "university", "shopping_mall", "department_store", "stadium", "airport"];
  const mediumTypes = ["hotel", "school", "gym", "restaurant", "supermarket", "warehouse"];
  if (types.some(t => largeTypes.some(lt => t.includes(lt)))) return "large";
  if (types.some(t => mediumTypes.some(mt => t.includes(mt)))) return "medium";
  if (reviewCount > 500) return "large";
  if (reviewCount > 100) return "medium";
  return "small";
}

// ===== STATE EXTRACTION =====
function extractState(address: string): string {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
    "Chandigarh", "Puducherry", "Jammu and Kashmir", "Ladakh",
  ];
  for (const part of parts) {
    for (const state of INDIAN_STATES) {
      if (part.toLowerCase().includes(state.toLowerCase())) return state;
    }
  }
  if (parts.length >= 2) return parts[parts.length - 2];
  return "";
}

// ===== CITY EXTRACTION =====
function extractCity(address: string): string {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || "";
}

// ===== SUBSCRIPTION PLANS =====
const PLANS = {
  starter: {
    name: "Starter",
    priceMonthly: 2999,
    priceYearly: 29990,
    maxConversations: 100,
    maxLeads: 500,
    maxScrapes: 10,
  },
  professional: {
    name: "Professional",
    priceMonthly: 7999,
    priceYearly: 79990,
    maxConversations: 500,
    maxLeads: 5000,
    maxScrapes: 50,
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 19999,
    priceYearly: 199990,
    maxConversations: -1,
    maxLeads: -1,
    maxScrapes: -1,
  },
};

function checkPlanLimits(plan: keyof typeof PLANS, currentCount: number, resource: "conversations" | "leads" | "scrapes"): boolean {
  const planData = PLANS[plan];
  const limitMap = {
    conversations: planData.maxConversations,
    leads: planData.maxLeads,
    scrapes: planData.maxScrapes,
  };
  const limit = limitMap[resource];
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
}

function calculateTrialEnd(startDate: Date, trialDays: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + trialDays);
  return end;
}

describe("Business Size Classification", () => {
  it("classifies hospitals as large", () => {
    expect(classifyBusinessSize(50, ["hospital"])).toBe("large");
  });

  it("classifies shopping malls as large", () => {
    expect(classifyBusinessSize(200, ["shopping_mall"])).toBe("large");
  });

  it("classifies universities as large", () => {
    expect(classifyBusinessSize(10, ["university"])).toBe("large");
  });

  it("classifies hotels as medium", () => {
    expect(classifyBusinessSize(50, ["hotel"])).toBe("medium");
  });

  it("classifies schools as medium", () => {
    expect(classifyBusinessSize(30, ["school"])).toBe("medium");
  });

  it("classifies restaurants as medium", () => {
    expect(classifyBusinessSize(20, ["restaurant"])).toBe("medium");
  });

  it("classifies high review count as large", () => {
    expect(classifyBusinessSize(600, ["shop"])).toBe("large");
  });

  it("classifies medium review count as medium", () => {
    expect(classifyBusinessSize(150, ["shop"])).toBe("medium");
  });

  it("classifies low review count as small", () => {
    expect(classifyBusinessSize(50, ["shop"])).toBe("small");
  });

  it("prioritizes type over review count", () => {
    expect(classifyBusinessSize(10, ["hospital"])).toBe("large");
    expect(classifyBusinessSize(1000, ["hotel"])).toBe("medium");
  });
});

describe("Address Extraction", () => {
  it("extracts Maharashtra from address", () => {
    expect(extractState("123 Main St, Pune, Maharashtra, India")).toBe("Maharashtra");
  });

  it("extracts Tamil Nadu from address", () => {
    expect(extractState("Anna Nagar, Chennai, Tamil Nadu, 600001")).toBe("Tamil Nadu");
  });

  it("extracts Delhi from address", () => {
    expect(extractState("Connaught Place, New Delhi, Delhi, India")).toBe("Delhi");
  });

  it("extracts Karnataka from address", () => {
    expect(extractState("MG Road, Bangalore, Karnataka")).toBe("Karnataka");
  });

  it("handles empty address", () => {
    expect(extractState("")).toBe("");
  });

  it("extracts city from address", () => {
    expect(extractCity("123 Main St, Pune, Maharashtra, India")).toBe("Pune");
  });

  it("extracts city from short address", () => {
    expect(extractCity("Mumbai, Maharashtra")).toBe("Mumbai");
  });

  it("handles empty city", () => {
    expect(extractCity("")).toBe("");
  });
});

describe("Subscription Plans", () => {
  it("starter plan has correct monthly price", () => {
    expect(PLANS.starter.priceMonthly).toBe(2999);
  });

  it("professional plan has correct yearly price", () => {
    expect(PLANS.professional.priceYearly).toBe(79990);
  });

  it("enterprise plan has unlimited conversations", () => {
    expect(PLANS.enterprise.maxConversations).toBe(-1);
  });

  it("yearly pricing gives ~17% discount", () => {
    const monthlyTotal = PLANS.starter.priceMonthly * 12;
    const yearlyTotal = PLANS.starter.priceYearly;
    const discount = ((monthlyTotal - yearlyTotal) / monthlyTotal) * 100;
    expect(discount).toBeGreaterThan(15);
    expect(discount).toBeLessThan(20);
  });
});

describe("Plan Limits", () => {
  it("allows within starter conversation limit", () => {
    expect(checkPlanLimits("starter", 50, "conversations")).toBe(true);
  });

  it("blocks exceeding starter conversation limit", () => {
    expect(checkPlanLimits("starter", 100, "conversations")).toBe(false);
  });

  it("allows within professional lead limit", () => {
    expect(checkPlanLimits("professional", 4999, "leads")).toBe(true);
  });

  it("blocks exceeding professional lead limit", () => {
    expect(checkPlanLimits("professional", 5000, "leads")).toBe(false);
  });

  it("enterprise has unlimited everything", () => {
    expect(checkPlanLimits("enterprise", 999999, "conversations")).toBe(true);
    expect(checkPlanLimits("enterprise", 999999, "leads")).toBe(true);
    expect(checkPlanLimits("enterprise", 999999, "scrapes")).toBe(true);
  });

  it("starter scrape limit is 10", () => {
    expect(checkPlanLimits("starter", 9, "scrapes")).toBe(true);
    expect(checkPlanLimits("starter", 10, "scrapes")).toBe(false);
  });
});

describe("Trial Calculation", () => {
  it("calculates 3-day trial end correctly", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const end = calculateTrialEnd(start, 3);
    expect(end.toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });

  it("calculates 7-day trial end correctly", () => {
    const start = new Date("2026-03-28T00:00:00Z");
    const end = calculateTrialEnd(start, 7);
    expect(end.toISOString()).toBe("2026-04-04T00:00:00.000Z");
  });

  it("handles month boundary", () => {
    const start = new Date("2026-01-29T00:00:00Z");
    const end = calculateTrialEnd(start, 3);
    expect(end.getUTCMonth()).toBe(1); // February
    expect(end.getUTCDate()).toBe(1);
  });
});
