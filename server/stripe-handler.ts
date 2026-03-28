import Stripe from "stripe";
import { Router, raw } from "express";
import { ENV } from "./_core/env";
import * as db from "./db";

function getStripe() {
  if (!ENV.stripeSecretKey) return null;
  return new Stripe(ENV.stripeSecretKey, { apiVersion: "2025-04-30.basil" as any });
}

export function registerStripeRoutes(app: Router) {
  // Webhook must use raw body for signature verification
  app.post("/api/stripe/webhook", raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      const stripeClient = getStripe();
      if (!stripeClient) return res.status(500).send("Stripe not configured");
      event = stripeClient.webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret || "");
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = parseInt(session.metadata?.user_id || "0");
          const plan = session.metadata?.plan as any;
          const billingCycle = session.metadata?.billing_cycle as any;

          if (userId && plan) {
            const existing = await db.getSubscriptionByUserId(userId);
            if (existing) {
              await db.updateSubscription(existing.id, {
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                plan,
                billingCycle: billingCycle || "monthly",
                status: "active" as any,
                currentPeriodStart: new Date(),
              });
            } else {
              await db.createSubscription({
                userId,
                plan,
                billingCycle: billingCycle || "monthly",
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                status: "active",
                currentPeriodStart: new Date(),
              });
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const sub = event.data.object as any;
          const stripeSubId = sub.id;
          let status: string = "active";
          if (sub.status === "trialing") status = "trialing";
          else if (sub.status === "past_due") status = "past_due";
          else if (sub.status === "canceled") status = "canceled";
          else if (sub.status === "active") status = "active";

          await db.updateSubscriptionByStripeId(stripeSubId, {
            status: status as any,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          });
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as any;
          await db.updateSubscriptionByStripeId(sub.id, {
            status: "canceled" as any,
          });
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            await db.updateSubscriptionByStripeId(invoice.subscription as string, {
              status: "active" as any,
              conversationsUsed: 0,
              scrapesUsed: 0,
            });
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            await db.updateSubscriptionByStripeId(invoice.subscription as string, {
              status: "past_due" as any,
            });
          }
          break;
        }
      }
    } catch (err) {
      console.error("[Stripe Webhook] Error processing event:", err);
    }

    res.json({ received: true });
  });
}

export { getStripe };
