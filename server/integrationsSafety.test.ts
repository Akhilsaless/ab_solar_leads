import { describe, expect, it } from "vitest";
import { getIntegrationStatus, processRazorpayPayout, sendWhatsAppMessage } from "./integrations";
import { getWhatsAppService } from "./whatsappService";

describe("disabled external integration safety", () => {
  it("never reports placeholder payment or WhatsApp adapters as enabled", () => {
    const status = getIntegrationStatus();
    expect(status.razorpay.enabled).toBe(false);
    expect(status.whatsapp.enabled).toBe(false);
  });

  it("fails closed for placeholder payout and WhatsApp sends", async () => {
    await expect(processRazorpayPayout(1, 1000)).resolves.toMatchObject({ success: false });
    await expect(sendWhatsAppMessage("919999999999", "synthetic QA message")).resolves.toMatchObject({ success: false });
    const service = await getWhatsAppService();
    await expect(service.sendTextMessage("919999999999", "synthetic QA message")).resolves.toMatchObject({ success: false });
    await expect(service.sendTemplateMessage("919999999999", "test_template", {})).resolves.toMatchObject({ success: false });
  });
});
