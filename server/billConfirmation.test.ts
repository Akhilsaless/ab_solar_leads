import { describe, expect, it } from "vitest";
import { buildConfirmedBillMessage, hasDetectedBillValue, normalizeBillConfirmation } from "../shared/billConfirmation";

describe("bill OCR confirmation", () => {
  it("keeps all OCR values editable before the estimate request is sent", () => {
    const values = normalizeBillConfirmation({
      amount: 6500,
      units: 720,
      state: "Telangana",
      discom: "TESTPOWER Telangana - DEMO DISCOM",
    });

    expect(values).toEqual({
      amount: "6500",
      units: "720",
      state: "Telangana",
      discom: "TESTPOWER Telangana - DEMO DISCOM",
    });
    expect(hasDetectedBillValue(values)).toBe(true);
    expect(buildConfirmedBillMessage(values)).toContain("reviewed and confirmed");
    expect(buildConfirmedBillMessage(values)).toContain("₹6500");
  });

  it("does not fabricate values when OCR returns no usable fields", () => {
    const values = normalizeBillConfirmation({ amount: null, units: null, state: null, discom: null });
    expect(hasDetectedBillValue(values)).toBe(false);
    expect(buildConfirmedBillMessage(values)).toContain("no values were clear enough");
  });
});
