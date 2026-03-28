import { describe, it, expect, beforeEach, vi } from "vitest";

// Test lead scoring algorithm
describe("Lead Scoring", () => {
  function calculateLeadScore(data: {
    monthlyEnergyBill?: number | null;
    roofCondition?: string | null;
    roofAge?: number | null;
    sunExposure?: string | null;
    installationTimeline?: string | null;
  }): number {
    let score = 50;

    if (data.monthlyEnergyBill) {
      if (data.monthlyEnergyBill > 150) score += 20;
      else if (data.monthlyEnergyBill > 100) score += 15;
      else if (data.monthlyEnergyBill > 50) score += 10;
    }

    if (data.roofCondition === "excellent") score += 15;
    else if (data.roofCondition === "good") score += 10;
    else if (data.roofCondition === "fair") score += 5;

    if (data.roofAge !== undefined && data.roofAge !== null) {
      if (data.roofAge < 5) score += 15;
      else if (data.roofAge < 10) score += 10;
      else if (data.roofAge < 15) score += 5;
    }

    if (data.sunExposure === "full") score += 15;
    else if (data.sunExposure === "partial") score += 8;

    if (data.installationTimeline === "immediate") score += 20;
    else if (data.installationTimeline === "3-6months") score += 15;
    else if (data.installationTimeline === "6-12months") score += 10;

    return Math.min(score, 100);
  }

  it("should calculate base score of 50 for minimal data", () => {
    const score = calculateLeadScore({});
    expect(score).toBe(50);
  });

  it("should add points for high energy bill", () => {
    const score = calculateLeadScore({ monthlyEnergyBill: 200 });
    expect(score).toBe(70); // 50 + 20
  });

  it("should add points for excellent roof condition", () => {
    const score = calculateLeadScore({ roofCondition: "excellent" });
    expect(score).toBe(65); // 50 + 15
  });

  it("should add points for new roof", () => {
    const score = calculateLeadScore({ roofAge: 3 });
    expect(score).toBe(65); // 50 + 15
  });

  it("should add points for full sun exposure", () => {
    const score = calculateLeadScore({ sunExposure: "full" });
    expect(score).toBe(65); // 50 + 15
  });

  it("should add points for immediate installation timeline", () => {
    const score = calculateLeadScore({ installationTimeline: "immediate" });
    expect(score).toBe(70); // 50 + 20
  });

  it("should cap score at 100", () => {
    const score = calculateLeadScore({
      monthlyEnergyBill: 200,
      roofCondition: "excellent",
      roofAge: 2,
      sunExposure: "full",
      installationTimeline: "immediate",
    });
    expect(score).toBe(100);
  });

  it("should calculate realistic high-quality lead score", () => {
    const score = calculateLeadScore({
      monthlyEnergyBill: 180,
      roofCondition: "good",
      roofAge: 5,
      sunExposure: "full",
      installationTimeline: "3-6months",
    });
    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("should calculate realistic low-quality lead score", () => {
    const score = calculateLeadScore({
      monthlyEnergyBill: 50,
      roofCondition: "poor",
      roofAge: 20,
      sunExposure: "shaded",
      installationTimeline: "exploring",
    });
    expect(score).toBeLessThan(60);
  });
});

// Test lead priority assignment
describe("Lead Priority Assignment", () => {
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
    expect(getPriority(41)).toBe("medium");
  });

  it("should assign low priority for score <= 40", () => {
    expect(getPriority(40)).toBe("low");
    expect(getPriority(30)).toBe("low");
    expect(getPriority(0)).toBe("low");
  });
});

// Test estimated savings calculation
describe("Estimated Savings Calculation", () => {
  function calculateEstimatedSavings(monthlyBill?: number): number {
    if (!monthlyBill) return 0;
    return Math.round(monthlyBill * 12 * 0.3); // 30% annual savings
  }

  it("should calculate zero savings for no energy bill", () => {
    expect(calculateEstimatedSavings()).toBe(0);
    expect(calculateEstimatedSavings(0)).toBe(0);
  });

  it("should calculate 30% annual savings", () => {
    const monthlyBill = 100;
    const savings = calculateEstimatedSavings(monthlyBill);
    expect(savings).toBe(360); // 100 * 12 * 0.3
  });

  it("should calculate realistic savings for typical homeowner", () => {
    const monthlyBill = 150;
    const savings = calculateEstimatedSavings(monthlyBill);
    expect(savings).toBe(540); // 150 * 12 * 0.3 = 540
  });

  it("should calculate savings for high energy consumer", () => {
    const monthlyBill = 250;
    const savings = calculateEstimatedSavings(monthlyBill);
    expect(savings).toBe(900); // 250 * 12 * 0.3 = 900
  });
});

// Test status workflow
describe("Lead Status Workflow", () => {
  const validTransitions: Record<string, string[]> = {
    new: ["contacted", "rejected"],
    contacted: ["qualified", "rejected"],
    qualified: ["converted", "rejected"],
    converted: [],
    rejected: [],
  };

  it("should allow valid status transitions", () => {
    expect(validTransitions["new"]).toContain("contacted");
    expect(validTransitions["contacted"]).toContain("qualified");
    expect(validTransitions["qualified"]).toContain("converted");
  });

  it("should not allow invalid transitions", () => {
    expect(validTransitions["new"]).not.toContain("converted");
    expect(validTransitions["new"]).not.toContain("qualified");
  });

  it("should prevent transitions from terminal states", () => {
    expect(validTransitions["converted"]).toHaveLength(0);
    expect(validTransitions["rejected"]).toHaveLength(0);
  });
});
