import { jsPDF } from "jspdf";
import {
  isCurrentVerifiedCatalogItem,
  isCurrentVerifiedInput,
} from "./catalogPricing";

export function calculatePartnerQuote(input: {
  bill: number;
  panels: any[];
  inverters: any[];
  pricing: any;
  state: any;
  now?: Date;
}) {
  const now = input.now || new Date();
  const { pricing, state } = input;
  const panels = input.panels.filter(
    p =>
      isCurrentVerifiedCatalogItem(p, now) &&
      Number(p.wattage) > 0 &&
      Number(p.pricePerPanel) > 0
  );
  const inverters = input.inverters.filter(
    p =>
      isCurrentVerifiedCatalogItem(p, now) &&
      Number(p.capacityKw) > 0 &&
      Number(p.price) > 0
  );
  if (
    !(input.bill > 0 && Number.isFinite(input.bill)) ||
    !pricing?.isPricingActive ||
    pricing.pricingMode !== "catalog" ||
    !isCurrentVerifiedInput(pricing, now) ||
    !state?.isActive ||
    !isCurrentVerifiedInput(state, now) ||
    !panels.length ||
    !inverters.length
  )
    throw new Error(
      "Verified installer catalogue, pricing and local inputs are required."
    );
  const tariff = Number(state.tariffPerUnit),
    sun = Number(state.avgSunHours),
    losses = Number(state.systemLossPercent ?? 15);
  const installationRate = Number(pricing.installationCostPerKw),
    bosRate = Number(pricing.balanceOfSystemCostPerKw),
    taxRate = Number(pricing.taxRatePercent ?? 0);
  if (
    !(
      tariff > 0 &&
      tariff <= 100 &&
      sun > 0 &&
      sun <= 12 &&
      losses >= 0 &&
      losses < 100 &&
      installationRate >= 0 &&
      bosRate >= 0 &&
      taxRate >= 0 &&
      taxRate <= 100
    ) ||
    pricing.installationCostPerKw == null ||
    pricing.balanceOfSystemCostPerKw == null
  )
    throw new Error("Installer calculation inputs are invalid.");
  const targetKw = input.bill / tariff / (30 * sun * (1 - losses / 100));
  if (targetKw > 10)
    throw new Error(
      "This enquiry requires an installer-designed system above the automated 10 kW limit."
    );
  const panel = panels.reduce((a, b) =>
    Number(a.pricePerPanel) / Number(a.wattage) <=
    Number(b.pricePerPanel) / Number(b.wattage)
      ? a
      : b
  );
  const panelCount = Math.ceil(
    (Math.max(1, targetKw) * 1000) / Number(panel.wattage)
  );
  const sizeKw = (panelCount * Number(panel.wattage)) / 1000;
  const inverter = inverters
    .filter(i => Number(i.capacityKw) >= sizeKw)
    .sort((a, b) => Number(a.capacityKw) - Number(b.capacityKw))[0];
  if (!inverter)
    throw new Error(
      "No verified inverter supports the proposed panel capacity. Installer design is required."
    );
  const round = (value: number) => Math.round(value * 100) / 100;
  const items = [
    {
      description: `${panel.brand} ${panel.model} · ${panel.wattage} W panel`,
      quantity: panelCount,
      unitPrice: Number(panel.pricePerPanel),
      amount: round(panelCount * Number(panel.pricePerPanel)),
    },
    {
      description: `${inverter.brand} ${inverter.model} · ${inverter.capacityKw} kW inverter`,
      quantity: 1,
      unitPrice: Number(inverter.price),
      amount: Number(inverter.price),
    },
    {
      description: "Installation (per installed kW)",
      quantity: sizeKw,
      unitPrice: installationRate,
      amount: round(sizeKw * installationRate),
    },
    {
      description: "Balance of system (per installed kW)",
      quantity: sizeKw,
      unitPrice: bosRate,
      amount: round(sizeKw * bosRate),
    },
  ];
  const subtotal = round(items.reduce((sum, item) => sum + item.amount, 0)),
    tax = round((subtotal * taxRate) / 100),
    total = round(subtotal + tax);
  const generationMonthly = round(sizeKw * sun * 30 * (1 - losses / 100));
  // Without a site load profile or confirmed export tariff, do not value exports or exceed the current bill.
  const maxSavingsMonthly = round(
    Math.min(input.bill, generationMonthly * tariff)
  );
  const validity =
    [
      pricing.effectiveTo,
      state.effectiveTo,
      panel.effectiveTo,
      inverter.effectiveTo,
    ]
      .filter(Boolean)
      .map(v => new Date(v).toISOString().slice(0, 10))
      .sort()[0] || now.toISOString().slice(0, 10);
  return {
    sizeKw,
    panelCount,
    panel: { brand: panel.brand, model: panel.model, wattage: panel.wattage },
    inverter: {
      brand: inverter.brand,
      model: inverter.model,
      capacityKw: inverter.capacityKw,
    },
    items,
    subtotal,
    taxRate,
    tax,
    total,
    subsidyAmount: null,
    generationMonthly,
    maxSavingsMonthly,
    bestCasePaybackYears:
      maxSavingsMonthly > 0 ? round(total / (maxSavingsMonthly * 12)) : null,
    pricingVersion: pricing.pricingVersion,
    validUntil: validity,
    tariff,
    sunHours: sun,
    lossesPercent: losses,
    disclosure: String(
      pricing.pricingDisclosure ||
        "Final design and quotation require site assessment."
    ),
    subsidyDisclosure: String(
      state.subsidyDisclosure ||
        "Subsidy eligibility and amount require separate verification; no subsidy is deducted."
    ),
    sourceNote: String(state.sourceNote || ""),
  };
}

export function buildPartnerProposalPdf(
  quote: ReturnType<typeof calculatePartnerQuote>,
  customer: { name: string; city: string },
  installer: string,
  reference: string
) {
  const doc = new jsPDF();
  let y = 20;
  const line = (value: string, size = 10) => {
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(
      value.replace(/[\u0000-\u001f]/g, " "),
      175
    ) as string[];
    for (const part of wrapped) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(part, 18, y);
      y += size === 18 ? 10 : 6;
    }
  };
  const money = (value: number) =>
    `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  line(installer, 18);
  line("Preliminary solar proposal", 14);
  line(
    `Reference: ${reference} | Pricing: ${quote.pricingVersion} | Valid through: ${quote.validUntil}`
  );
  line(`Prepared for: ${customer.name} | Location: ${customer.city}`);
  y += 4;
  line(
    `Proposed DC capacity: ${quote.sizeKw.toFixed(3)} kW | Panels: ${quote.panelCount}`
  );
  for (const item of quote.items)
    line(
      `${item.description} | ${item.quantity} x ${money(item.unitPrice)} = ${money(item.amount)}`
    );
  line(`Subtotal: ${money(quote.subtotal)}`);
  line(`Tax / markup (${quote.taxRate}%): ${money(quote.tax)}`);
  line(`Estimated total before subsidy: ${money(quote.total)}`, 14);
  line(
    "No subsidy deducted. This is not a subsidy approval or a binding installation contract."
  );
  y += 4;
  line(
    `Generation assumption: ${quote.generationMonthly} kWh/month; tariff INR ${quote.tariff}/kWh; sun ${quote.sunHours} hours/day; losses ${quote.lossesPercent}%.`
  );
  line(
    `Upper savings scenario: up to ${money(quote.maxSavingsMonthly)}/month, only if generated power offsets usage at the assumed tariff. Actual savings may be lower; export credits and fixed charges are not modelled.`
  );
  line(
    `Best-case simple payback under that scenario: ${quote.bestCasePaybackYears ?? "unavailable"} years. Financing, degradation, maintenance and future tariff changes are excluded.`
  );
  line(quote.disclosure);
  line(quote.subsidyDisclosure);
  line(
    "Roof ownership/permission, usable area, shading, structural suitability, electrical compatibility and DISCOM requirements must be confirmed by the installer at survey."
  );
  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

export function calculatorView(
  quote: ReturnType<typeof calculatePartnerQuote>
) {
  return {
    systemSizeKw: quote.sizeKw,
    panelCount: quote.panelCount,
    panelBrand: quote.panel.brand,
    panelModel: quote.panel.model,
    panelWattage: quote.panel.wattage,
    inverterBrand: quote.inverter.brand,
    inverterModel: quote.inverter.model,
    inverterCapacity: Number(quote.inverter.capacityKw),
    totalPanelCost: quote.items[0].amount,
    inverterPrice: quote.items[1].amount,
    installationCost: quote.items[2].amount,
    balanceOfSystemCost: quote.items[3].amount,
    totalCost: quote.total,
    totalSubsidy: 0,
    centralSubsidy: 0,
    stateSubsidy: 0,
    netCost: quote.total,
    monthlySavings: quote.maxSavingsMonthly,
    annualSavings: quote.maxSavingsMonthly * 12,
    paybackYears: quote.bestCasePaybackYears || 0,
    lifetimeSavings: quote.maxSavingsMonthly * 12 * 25 - quote.total,
    pricingVersion: quote.pricingVersion,
    validUntil: quote.validUntil,
    assumptions: quote,
  };
}
