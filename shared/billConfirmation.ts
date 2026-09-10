export type BillConfirmationValues = {
  amount: string;
  units: string;
  state: string;
  discom: string;
};

type RawBillValues = {
  amount?: number | string | null;
  units?: number | string | null;
  state?: string | null;
  discom?: string | null;
};

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function normalizeBillConfirmation(values: RawBillValues): BillConfirmationValues {
  return {
    amount: text(values.amount),
    units: text(values.units),
    state: text(values.state),
    discom: text(values.discom),
  };
}

export function hasDetectedBillValue(values: BillConfirmationValues): boolean {
  return Object.values(values).some(Boolean);
}

export function buildConfirmedBillMessage(values: BillConfirmationValues): string {
  const facts = [
    values.amount ? `monthly bill ₹${values.amount}` : null,
    values.units ? `${values.units} units` : null,
    values.state ? `state ${values.state}` : null,
    values.discom ? `DISCOM ${values.discom}` : null,
  ].filter(Boolean).join(", ");

  return facts
    ? `I reviewed and confirmed the details detected from my uploaded bill: ${facts}. Please use only these confirmed details for a preliminary estimate.`
    : "I reviewed the uploaded bill, but no values were clear enough to confirm. Please ask for only the minimum information needed for an estimate.";
}
