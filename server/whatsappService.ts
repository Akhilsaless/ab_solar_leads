/**
 * WhatsApp Business API Integration Service
 * Handles both automated business outreach and hostel referrer recruitment
 * API credentials are configured in settings and stored in database
 */

import axios, { AxiosInstance } from "axios";
import * as db from "./db";
import { sql } from "drizzle-orm";

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
  private client: AxiosInstance | null = null;
  private config: WhatsAppConfig | null = null;
  private readonly API_VERSION = "v18.0";
  private readonly BASE_URL = "https://graph.instagram.com";

  /**
   * Initialize WhatsApp service with credentials from database
   */
  async initialize(): Promise<void> {
    try {
      const dbConn = await db.getDb();
      if (!dbConn) {
        console.log("[WhatsApp] Database connection not available");
        return;
      }

      // Get WhatsApp config from settings
      const configResult = await dbConn.execute(sql`
        SELECT * FROM agencyConfig3 
        WHERE whatsappPhoneNumberId IS NOT NULL 
        LIMIT 1
      `) as any[];

      const configData = Array.isArray(configResult[0]) && configResult[0].length > 0 
        ? configResult[0][0] 
        : null;

      if (configData && configData.whatsappAccessToken) {
        this.config = {
          phoneNumberId: configData.whatsappPhoneNumberId,
          businessAccountId: configData.whatsappBusinessAccountId,
          accessToken: configData.whatsappAccessToken,
          isConfigured: true,
        };

        this.client = axios.create({
          baseURL: `${this.BASE_URL}/${this.API_VERSION}`,
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        console.log("[WhatsApp] Service initialized successfully");
      } else {
        console.log("[WhatsApp] Configuration not found - waiting for API credentials");
        this.config = {
          phoneNumberId: "",
          businessAccountId: "",
          accessToken: "",
          isConfigured: false,
        };
      }
    } catch (error) {
      console.error("[WhatsApp] Initialization error:", error);
      this.config = {
        phoneNumberId: "",
        businessAccountId: "",
        accessToken: "",
        isConfigured: false,
      };
    }
  }

  /**
   * Check if WhatsApp is configured
   */
  isConfigured(): boolean {
    return this.config?.isConfigured || false;
  }

  /**
   * Save WhatsApp credentials to database
   */
  async saveCredentials(
    phoneNumberId: string,
    businessAccountId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");

      await dbConn.execute(sql`
        UPDATE agencyConfig3 
        SET 
          whatsappPhoneNumberId = ${phoneNumberId},
          whatsappBusinessAccountId = ${businessAccountId},
          whatsappAccessToken = ${accessToken}
        LIMIT 1
      `);

      // Reinitialize with new credentials
      await this.initialize();
      return true;
    } catch (error) {
      console.error("[WhatsApp] Error saving credentials:", error);
      return false;
    }
  }

  /**
   * Send text message via WhatsApp
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    if (!this.isConfigured() || !this.client) {
      return { success: false, error: "WhatsApp not configured" };
    }

    try {
      const response = await this.client.post(`/${this.config!.phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/\D/g, ""), // Remove non-digits
        type: "text",
        text: {
          preview_url: true,
          body: message,
        },
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error("[WhatsApp] Error sending message:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || "Failed to send message",
      };
    }
  }

  /**
   * Send template message (for business outreach)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateParams: Record<string, string>
  ): Promise<WhatsAppResponse> {
    if (!this.isConfigured() || !this.client) {
      return { success: false, error: "WhatsApp not configured" };
    }

    try {
      const response = await this.client.post(`/${this.config!.phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en_US",
          },
          parameters: {
            body: {
              parameters: Object.values(templateParams),
            },
          },
        },
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error("[WhatsApp] Error sending template:", error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || "Failed to send template",
      };
    }
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

Earn milestone commissions by sharing eligible solar leads:
✅ Lead verification and consent tracked
✅ ₹500 subsidy verification
✅ ₹1,500 installation commission

Your referral link: ${referralLink}

Share with friends → They get free solar estimates → You earn money!

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

Plus: Government subsidy up to ₹15 lakhs available.

Get your free solar potential report:
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

Your Sales Squad earnings:
📊 Today: ₹${todayEarnings}
💵 Total: ₹${totalEarnings}
👥 Leads: ${leadsCount}

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

Your payout of ₹${amount} has been processed!

Transferred to: ${upiId}

Check your bank account within 5 minutes.

Keep earning with Sales Squad! 💪

- Sales Squad Team`;

    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Webhook handler for incoming messages
   */
  async handleWebhook(data: any): Promise<void> {
    try {
      const messages = data.entry?.[0]?.changes?.[0]?.value?.messages || [];

      for (const message of messages) {
        const fromPhone = message.from;
        const messageBody = message.text?.body || "";
        const messageId = message.id;

        console.log(`[WhatsApp] Received message from ${fromPhone}: ${messageBody}`);

        // Store in database for tracking
        const dbConn = await db.getDb();
        if (dbConn) {
          await dbConn.execute(sql`
            INSERT INTO outreachCampaignRecords 
            (status, replyText, repliedAt, replySource)
            VALUES ('replied', ${messageBody}, NOW(), 'whatsapp')
            WHERE phone = ${fromPhone}
          `);
        }
      }
    } catch (error) {
      console.error("[WhatsApp] Webhook error:", error);
    }
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
