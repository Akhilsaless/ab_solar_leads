import { addPlatformCommunicationAudit } from "./platformCommunicationService";

/**
 * WhatsApp Business API Integration Service
 * Handles both automated business outreach and hostel referrer recruitment
 * API credentials are configured in settings and stored in database
 */


interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  isConfigured: boolean;
}

interface WhatsAppMessage {
  to: string;
  messageType: "text" | "template";
  body?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class WhatsAppService {
  private client: null = null;
  private config: WhatsAppConfig | null = null;

  /**
   * Initialize WhatsApp service with credentials from database
   */
  async initialize(): Promise<void> {
    this.client = null;
    this.config = { phoneNumberId: "", businessAccountId: "", accessToken: "", isConfigured: false };
    console.info("[WhatsApp] Disabled until a verified provider adapter and signed webhook implementation are installed.");
  }

  /**
   * Check if WhatsApp is configured
   */
  isConfigured(): boolean {
    return false;
  }

  /**
   * Save WhatsApp credentials to database
   */
  async saveCredentials(
    phoneNumberId: string,
    businessAccountId: string,
    accessToken: string
  ): Promise<boolean> {
    void phoneNumberId;
    void businessAccountId;
    void accessToken;
    console.warn("[WhatsApp] Credential storage is disabled until the provider adapter uses encrypted server-side configuration.");
    return false;
  }

  /**
   * Send text message via WhatsApp
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    void to;
    void message;
    await addPlatformCommunicationAudit({ channel: "whatsapp", action: "automated_send", result: "blocked", metadata: { reason: "provider_adapter_not_installed" } });
    return { success: false, error: "WhatsApp is disabled until a verified provider adapter is installed and explicitly enabled." };
  }

  /**
   * Send template message (for business outreach)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateParams: Record<string, string>
  ): Promise<WhatsAppResponse> {
    void to;
    void templateName;
    void templateParams;
    await addPlatformCommunicationAudit({ channel: "whatsapp", action: "automated_template_send", result: "blocked", metadata: { reason: "provider_adapter_not_installed" } });
    return { success: false, error: "WhatsApp is disabled until a verified provider adapter is installed and explicitly enabled." };
  }

  /**
   * Send hostel referrer recruitment message
   */
  async sendHostelReferrerMessage(
    phoneNumber: string,
    referrerName: string,
    referralLink: string
  ): Promise<WhatsAppResponse> {
    const message = `Hi ${referrerName}! 👋

Welcome to Sales Squad! 

Share eligible solar leads with consent tracked.
Any referral terms are confirmed directly by Sales Squad before activation.

Your referral link: ${referralLink}

Share with contacts who have asked to hear more about solar.

Questions? Reply here or visit our site.

- Sales Squad Team`;

    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Send business outreach message
   */
  async sendBusinessOutreachMessage(
    phoneNumber: string,
    businessName: string,
    ownerName: string,
    industryBenefit: string,
    chatbotLink: string
  ): Promise<WhatsAppResponse> {
    const message = `Hi ${ownerName},

We help businesses like ${businessName} cut electricity bills with solar.

${industryBenefit}

Get a preliminary solar assessment:
${chatbotLink}

- Sales Squad`;

    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Send daily earnings update to referrer
   */
  async sendEarningsUpdate(
    phoneNumber: string,
    referrerName: string,
    todayEarnings: number,
    totalEarnings: number,
    leadsCount: number
  ): Promise<WhatsAppResponse> {
    const message = `Hi ${referrerName}! 💰

Your Sales Squad referral activity:
Today: ₹${todayEarnings}
Total: ₹${totalEarnings}
Eligible leads: ${leadsCount}

Keep sharing to earn more!

Your link: [REFERRAL_LINK]

- Sales Squad`;

    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Send payout notification
   */
  async sendPayoutNotification(
    phoneNumber: string,
    referrerName: string,
    amount: number,
    upiId: string
  ): Promise<WhatsAppResponse> {
    const message = `Hi ${referrerName}! 🎉

Your payout request of ₹${amount} has been recorded for confirmation.

Payment details will be confirmed by Sales Squad.

Keep earning with Sales Squad! 💪

- Sales Squad Team`;

    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Webhook handler for incoming messages
   */
  async handleWebhook(data: any): Promise<void> {
    void data;
    console.warn("[WhatsApp] Webhook intake is disabled until a signed provider webhook implementation is installed.");
  }
}

// Singleton instance
let whatsappService: WhatsAppService | null = null;

export async function getWhatsAppService(): Promise<WhatsAppService> {
  if (!whatsappService) {
    whatsappService = new WhatsAppService();
    await whatsappService.initialize();
  }
  return whatsappService;
}

export { WhatsAppService, WhatsAppConfig, WhatsAppMessage, WhatsAppResponse };
