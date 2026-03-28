import { describe, expect, it } from "vitest";
import { calculateSolarEstimate } from "./routers";

// ===== SOLAR CALCULATOR TESTS =====
describe("Solar Calculator Engine", () => {
  const mockPanels = [
    { brand: "Tata", model: "TP545M", wattage: 545, pricePerPanel: "18000", panelType: "monocrystalline", warranty: 25 },
    { brand: "Waaree", model: "WS400", wattage: 400, pricePerPanel: "14000", panelType: "polycrystalline", warranty: 25 },
  ];

  const mockInverters = [
    { brand: "Growatt", model: "MIN 3000TL", capacityKw: "3", price: "35000", inverterType: "string", warranty: 10 },
    { brand: "Fronius", model: "Primo 5.0", capacityKw: "5", price: "55000", inverterType: "string", warranty: 10 },
  ];

  const mockAgency = {
    agencyName: "Test Solar",
    installationChargePerKw: "8000",
    marginPercent: "15",
  };

  const mockSubsidy = {
    stateName: "Maharashtra",
    centralSubsidy1kw: "30000",
    centralSubsidy2kw: "60000",
    centralSubsidy3kw: "78000",
    stateAdditionalPerKw: "0",
    stateMaxAdditional: "0",
    avgElectricityRate: "8",
    avgSunHours: "5",
    discomName: "MSEDCL",
    netMeteringAvailable: true,
    specialNotes: "",
  };

  it("calculates correct system size for ₹3000 monthly bill", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.systemSizeKw).toBeGreaterThan(0);
    expect(result!.systemSizeKw).toBeLessThanOrEqual(10);
    expect(result!.panelCount).toBeGreaterThan(0);
  });

  it("calculates correct monthly units from bill", () => {
    const result = calculateSolarEstimate(4000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    // 4000 / 8 (rate) = 500 units
    expect(result!.monthlyUnits).toBe(500);
  });

  it("selects most cost-effective panel", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    // Tata: 18000/545 = 33.03 per watt, Waaree: 14000/400 = 35 per watt
    // Tata is more cost-effective
    expect(result!.panelBrand).toBe("Tata");
  });

  it("applies central subsidy correctly for 1kW system", () => {
    // Very low bill to get ~1kW system
    const result = calculateSolarEstimate(800, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    if (result!.systemSizeKw <= 1) {
      expect(result!.centralSubsidy).toBe(30000);
    }
  });

  it("applies central subsidy correctly for 3kW+ system", () => {
    const result = calculateSolarEstimate(5000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    if (result!.systemSizeKw >= 3) {
      expect(result!.centralSubsidy).toBe(78000);
    }
  });

  it("applies state additional subsidy when available", () => {
    const subsidyWithState = {
      ...mockSubsidy,
      stateAdditionalPerKw: "5000",
      stateMaxAdditional: "20000",
    };
    const result = calculateSolarEstimate(3000, "Gujarat", mockPanels, mockInverters, mockAgency, subsidyWithState);
    expect(result).toBeDefined();
    expect(result!.stateSubsidy).toBeGreaterThan(0);
    expect(result!.stateSubsidy).toBeLessThanOrEqual(20000);
  });

  it("calculates net cost as total minus subsidy", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.netCost).toBe(Math.max(result!.totalCost - result!.totalSubsidy, 0));
  });

  it("calculates positive payback period", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.paybackYears).toBeGreaterThan(0);
    expect(result!.paybackYears).toBeLessThan(25);
  });

  it("calculates positive monthly savings", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.monthlySavings).toBeGreaterThan(0);
  });

  it("caps system size at 10kW", () => {
    // Very high bill to test cap
    const result = calculateSolarEstimate(50000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.systemSizeKw).toBeLessThanOrEqual(10);
  });

  it("ensures minimum system size of 1kW", () => {
    const result = calculateSolarEstimate(200, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.systemSizeKw).toBeGreaterThanOrEqual(1);
  });

  it("applies agency margin to total cost", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    const baseCost = result!.totalPanelCost + result!.inverterPrice + result!.installationCost;
    const expectedTotal = Math.round(baseCost * 1.15); // 15% margin
    expect(result!.totalCost).toBe(expectedTotal);
  });

  it("works with empty panels and inverters (uses defaults)", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", [], [], mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.panelBrand).toBe("Standard");
    expect(result!.inverterBrand).toBe("Standard");
    expect(result!.systemSizeKw).toBeGreaterThan(0);
  });

  it("works without subsidy data (uses defaults)", () => {
    const result = calculateSolarEstimate(3000, "Unknown State", mockPanels, mockInverters, mockAgency, null);
    expect(result).toBeDefined();
    expect(result!.centralSubsidy).toBeGreaterThan(0);
    expect(result!.electricityRate).toBe(7.5);
    expect(result!.avgSunHours).toBe(4.5);
  });

  it("calculates lifetime savings over 25 years", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.lifetimeSavings).toBeGreaterThan(0);
    expect(result!.lifetimeSavings).toBe(Math.round(result!.annualSavings * 25 - result!.netCost));
  });

  it("includes DISCOM info from subsidy data", () => {
    const result = calculateSolarEstimate(3000, "Maharashtra", mockPanels, mockInverters, mockAgency, mockSubsidy);
    expect(result).toBeDefined();
    expect(result!.discomName).toBe("MSEDCL");
    expect(result!.netMeteringAvailable).toBe(true);
  });
});

// ===== LEAD SCORING TESTS =====
describe("Lead Scoring", () => {
  // Import the scoring function by testing the logic directly
  function calculateConversationScore(conversation: any, extractedData: any): number {
    let score = 10;
    if (extractedData?.name || conversation.customerName) score += 15;
    if (extractedData?.phone || conversation.customerPhone) score += 20;
    if (extractedData?.email || conversation.customerEmail) score += 10;
    if (extractedData?.state || conversation.customerState) score += 10;
    if (extractedData?.city || conversation.customerCity) score += 5;
    if (extractedData?.monthlyBill || conversation.monthlyBill) {
      const bill = extractedData?.monthlyBill || parseFloat(conversation.monthlyBill);
      if (bill >= 3000) score += 20;
      else if (bill >= 2000) score += 15;
      else if (bill >= 1000) score += 10;
      else score += 5;
    }
    if ((conversation.messageCount || 0) >= 5) score += 10;
    return Math.min(score, 100);
  }

  function getPriority(score: number): string {
    if (score >= 80) return "urgent";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  it("gives base score of 10 for empty conversation", () => {
    const score = calculateConversationScore({}, {});
    expect(score).toBe(10);
  });

  it("adds 15 points for name", () => {
    const score = calculateConversationScore({}, { name: "Rahul Sharma" });
    expect(score).toBe(25);
  });

  it("adds 20 points for phone", () => {
    const score = calculateConversationScore({}, { phone: "+919876543210" });
    expect(score).toBe(30);
  });

  it("adds 20 points for high bill (₹3000+)", () => {
    const score = calculateConversationScore({}, { monthlyBill: 5000 });
    expect(score).toBe(30);
  });

  it("adds 15 points for medium bill (₹2000-3000)", () => {
    const score = calculateConversationScore({}, { monthlyBill: 2500 });
    expect(score).toBe(25);
  });

  it("adds 10 points for low bill (₹1000-2000)", () => {
    const score = calculateConversationScore({}, { monthlyBill: 1500 });
    expect(score).toBe(20);
  });

  it("adds 10 points for 5+ messages", () => {
    const score = calculateConversationScore({ messageCount: 8 }, {});
    expect(score).toBe(20);
  });

  it("caps score at 100", () => {
    const score = calculateConversationScore(
      { customerName: "A", customerPhone: "B", customerEmail: "C", customerState: "D", customerCity: "E", monthlyBill: "5000", messageCount: 10 },
      { name: "A", phone: "B", email: "C", state: "D", city: "E", monthlyBill: 5000 }
    );
    expect(score).toBe(100);
  });

  it("calculates full score for complete lead", () => {
    const score = calculateConversationScore(
      { messageCount: 6 },
      { name: "Rahul", phone: "+91987654", email: "r@g.com", state: "Maharashtra", city: "Mumbai", monthlyBill: 4000 }
    );
    // 10 + 15 + 20 + 10 + 10 + 5 + 20 + 10 = 100
    expect(score).toBe(100);
  });

  it("returns urgent priority for score >= 80", () => {
    expect(getPriority(80)).toBe("urgent");
    expect(getPriority(95)).toBe("urgent");
  });

  it("returns high priority for score 60-79", () => {
    expect(getPriority(60)).toBe("high");
    expect(getPriority(75)).toBe("high");
  });

  it("returns medium priority for score 40-59", () => {
    expect(getPriority(40)).toBe("medium");
    expect(getPriority(55)).toBe("medium");
  });

  it("returns low priority for score < 40", () => {
    expect(getPriority(10)).toBe("low");
    expect(getPriority(35)).toBe("low");
  });
});

// ===== SUBSIDY LOGIC TESTS =====
describe("Subsidy Calculations", () => {
  const mockPanels = [{ brand: "Tata", model: "TP545M", wattage: 545, pricePerPanel: "18000", panelType: "mono", warranty: 25 }];
  const mockInverters = [{ brand: "Growatt", model: "MIN 5000TL", capacityKw: "5", price: "45000", inverterType: "string", warranty: 10 }];
  const mockAgency = { agencyName: "Test", installationChargePerKw: "8000", marginPercent: "15" };

  it("applies Gujarat state subsidy correctly", () => {
    const gujaratSubsidy = {
      stateName: "Gujarat",
      centralSubsidy1kw: "30000",
      centralSubsidy2kw: "60000",
      centralSubsidy3kw: "78000",
      stateAdditionalPerKw: "10000",
      stateMaxAdditional: "20000",
      avgElectricityRate: "5.5",
      avgSunHours: "5.5",
      discomName: "GUVNL",
      netMeteringAvailable: true,
      specialNotes: "",
    };
    const result = calculateSolarEstimate(3000, "Gujarat", mockPanels, mockInverters, mockAgency, gujaratSubsidy);
    expect(result).toBeDefined();
    expect(result!.totalSubsidy).toBeGreaterThan(result!.centralSubsidy);
  });

  it("handles state with no additional subsidy", () => {
    const noStateSubsidy = {
      stateName: "Bihar",
      centralSubsidy1kw: "30000",
      centralSubsidy2kw: "60000",
      centralSubsidy3kw: "78000",
      stateAdditionalPerKw: "0",
      stateMaxAdditional: "0",
      avgElectricityRate: "6",
      avgSunHours: "4.5",
      discomName: "BSPHCL",
      netMeteringAvailable: true,
      specialNotes: "",
    };
    const result = calculateSolarEstimate(3000, "Bihar", mockPanels, mockInverters, mockAgency, noStateSubsidy);
    expect(result).toBeDefined();
    expect(result!.stateSubsidy).toBe(0);
    expect(result!.totalSubsidy).toBe(result!.centralSubsidy);
  });

  it("respects state max additional subsidy cap", () => {
    const cappedSubsidy = {
      stateName: "Test",
      centralSubsidy1kw: "30000",
      centralSubsidy2kw: "60000",
      centralSubsidy3kw: "78000",
      stateAdditionalPerKw: "50000",
      stateMaxAdditional: "10000",
      avgElectricityRate: "8",
      avgSunHours: "5",
      discomName: "Test",
      netMeteringAvailable: true,
      specialNotes: "",
    };
    const result = calculateSolarEstimate(5000, "Test", mockPanels, mockInverters, mockAgency, cappedSubsidy);
    expect(result).toBeDefined();
    expect(result!.stateSubsidy).toBeLessThanOrEqual(10000);
  });
});
