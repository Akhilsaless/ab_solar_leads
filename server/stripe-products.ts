/**
 * Sales Squad Subscription Plans
 * Prices in INR (Indian Rupees)
 */

export const PLANS = {
  starter: {
    name: "Starter",
    description: "Perfect for small agencies getting started with AI solar sales",
    priceMonthly: 2999, // ₹2,999/month
    priceYearly: 29990, // ₹29,990/year (save ₹5,998)
    features: [
      "AI Sales Bot (1 bot link)",
      "Up to 100 conversations/month",
      "50 business scrapes/month",
      "Basic analytics",
      "Email support",
      "5 panel & inverter models",
    ],
    limits: {
      conversations: 100,
      scrapes: 50,
      products: 5,
      botLinks: 1,
    },
  },
  professional: {
    name: "Professional",
    description: "For growing agencies that need more power and insights",
    priceMonthly: 7999, // ₹7,999/month
    priceYearly: 79990, // ₹79,990/year (save ₹15,998)
    features: [
      "AI Sales Bot (3 bot links)",
      "Up to 500 conversations/month",
      "200 business scrapes/month",
      "Advanced analytics & reports",
      "Priority support",
      "20 panel & inverter models",
      "Custom bot personality",
      "Lead export (CSV)",
    ],
    limits: {
      conversations: 500,
      scrapes: 200,
      products: 20,
      botLinks: 3,
    },
    popular: true,
  },
  enterprise: {
    name: "Enterprise",
    description: "Unlimited power for large agencies dominating their market",
    priceMonthly: 19999, // ₹19,999/month
    priceYearly: 199990, // ₹199,990/year (save ₹39,998)
    features: [
      "AI Sales Bot (Unlimited links)",
      "Unlimited conversations",
      "Unlimited business scrapes",
      "Full analytics suite",
      "Dedicated account manager",
      "Unlimited products",
      "Custom bot personality & branding",
      "API access",
      "White-label option",
      "Team collaboration",
    ],
    limits: {
      conversations: -1, // unlimited
      scrapes: -1,
      products: -1,
      botLinks: -1,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export const TRIAL_DAYS = 3;
