/**
 * Optional Integration Placeholders
 * Add API keys in environment variables to enable
 */

// Razorpay Integration (Optional)
export async function initRazorpay() {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    console.warn("[Razorpay] Not configured. Payouts disabled.");
    return null;
  }

  return { configured: true };
}

export async function processRazorpayPayout(
  withdrawalId: number,
  amount: number,
  upiId?: string,
  bankAccount?: string
) {
  const razorpay = await initRazorpay();
  if (!razorpay) {
    console.warn("[Razorpay] Not configured. Payout cannot be processed.");
    return { success: false, message: "Razorpay not configured" };
  }

  void razorpay;
  void withdrawalId;
  void amount;
  void upiId;
  void bankAccount;
  return { success: false, message: "Razorpay payouts are disabled because a production payout adapter is not installed." };
}

// WhatsApp Integration (Optional)
export async function initWhatsApp() {
  const whatsappApiKey = process.env.WHATSAPP_API_KEY;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID;

  if (!whatsappApiKey || !whatsappPhoneId) {
    console.warn("[WhatsApp] Not configured. Notifications disabled.");
    return null;
  }

  void whatsappApiKey;
  void whatsappPhoneId;
  return { configured: true };
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  messageType: "text" | "template" = "text"
) {
  const whatsapp = await initWhatsApp();
  if (!whatsapp) {
    console.warn("[WhatsApp] Not configured. Message not sent.");
    return { success: false, message: "WhatsApp not configured" };
  }

  void whatsapp;
  void phoneNumber;
  void message;
  void messageType;
  return { success: false, message: "WhatsApp sending is disabled because a verified production provider adapter is not installed." };
}

export async function sendWhatsAppNotification(
  phoneNumber: string,
  notificationType: "signup" | "bonus" | "withdrawal" | "referral",
  data: any
) {
  let message = "";

  switch (notificationType) {
    case "signup":
      message = `Welcome to Sales Squad Referral Program! Your code: ${data.referralCode}. Share to earn ₹500+ per referral!`;
      break;
    case "bonus":
      message = `🎉 Bonus credited! ₹${data.amount} added to your account. Total earnings: ₹${data.totalEarnings}`;
      break;
    case "withdrawal":
      message = `✅ Withdrawal of ₹${data.amount} approved! Will reach your ${data.method} within 24 hours.`;
      break;
    case "referral":
      message = `📱 New referral from ${data.referralName}! Earn ₹${data.bonusAmount} when they install.`;
      break;
  }

  return await sendWhatsAppMessage(phoneNumber, message, "text");
}

// Configuration Status
export function getIntegrationStatus() {
  return {
    razorpay: {
      enabled: false,
      configured: !!process.env.RAZORPAY_KEY_ID,
      adapterAvailable: false,
    },
    whatsapp: {
      enabled: false,
      configured: !!process.env.WHATSAPP_API_KEY,
      adapterAvailable: false,
    },
  };
}
