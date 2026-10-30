import { registerFollowupRoutes } from "../followup";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { sdk } from "./sdk";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getEmailServiceStatus, initializeEmailService } from "./emailService";
import { followUpEmailsHandler } from "../followUpEmailHandler";
import { adminDigestHandler } from "../adminDigestHandler";
import { referrerOnboardingHandler } from "../referrerOnboardingHandler";
import { autoOutreachHandler, triggerNowHandler } from "../autoOutreachHandler";
import { scrapedFollowUpHandler } from "../scrapedFollowUpHandler";
import { trackEmailOpenHandler } from "../trackEmailOpenHandler";
import { emailEventWebhookHandler } from "../emailEventWebhook";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { registerAgencyWhatsAppRoutes, dispatchSolarWhatsApp } from "../agencyWhatsApp";

// Owner auth middleware for admin endpoints
const authenticateOwner = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const user = await sdk.authenticateRequest(req);
    const ownerId = process.env.OWNER_OPEN_ID;
    if (!ownerId) return res.status(503).json({ error: "Owner access is not configured" });
    if (user.openId !== ownerId || user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Owner access required" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Authentication required" });
  }
};

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Stripe webhook must be registered BEFORE json body parser
  const { registerStripeRoutes } = await import("../stripe-handler");
  registerStripeRoutes(app);
  registerAgencyWhatsAppRoutes(app);
  registerFollowupRoutes(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for uploaded assets
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  app.get("/api/health", async (_req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ status: "degraded", database: "unavailable" });
      await database.execute(sql`SELECT 1 FROM agencyConfig3 LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM campaignProfiles LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM aiGatewaySettings LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM agencyFeatureControls LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM agencyEstimateSettings LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM platformCommunicationSettings LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM platformSafetyControls LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarLeadWorkflow LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarChatIdentity LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarSurveySlots LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM partnerSalesOperations LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM leadCaptureKeys LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarOtpLimits LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM agencyWhatsAppConnections LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarWhatsAppMessages LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarProposals LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarWhatsAppReceipts LIMIT 1`);
      await database.execute(sql`SELECT 1 FROM solarCommercialAccruals LIMIT 1`);
      let release = null;
      try { release = JSON.parse(readFileSync(new URL("./release.json", import.meta.url), "utf8")); } catch { /* No claimed release provenance in development. */ }
      return res.json({ status: "ok", database: "ready", release });
    } catch (error: any) {
      const code = error?.code || error?.cause?.code;
      return res.status(503).json({ status: "degraded", database: code === "ER_NO_SUCH_TABLE" ? "migration_required" : "query_failed" });
    }
  });
  // Follow-up email scheduler (cron-only endpoint)
  app.post("/api/scheduled/followUpEmails", followUpEmailsHandler);
  // Admin daily digest (cron-only endpoint)
  app.post("/api/scheduled/adminDigest", adminDigestHandler);
  // Referrer onboarding email sequence (cron-only endpoint)
  app.post("/api/scheduled/referrerOnboarding", referrerOnboardingHandler);
  // Auto outreach - 5 daily slots
  app.post("/api/scheduled/autoOutreach", autoOutreachHandler);
  // Trigger Now - admin-initiated immediate run (requires owner auth)
  app.post("/api/admin/triggerNow", authenticateOwner, triggerNowHandler);
  // Scraped business follow-up emails (Day 3 + Day 7)
  app.post("/api/scheduled/scrapedFollowUp", scrapedFollowUpHandler);
  // Email open tracking pixel (public GET endpoint)
  app.get("/api/track/open", trackEmailOpenHandler);
  // Provider-neutral email events. It fails closed until EMAIL_EVENT_WEBHOOK_SECRET is configured.
  app.post("/api/webhooks/email-events", emailEventWebhookHandler);
  app.post("/api/scheduled/solar-whatsapp", dispatchSolarWhatsApp);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // Initialize email service and verify SMTP connection
    try {
      const emailReady = await initializeEmailService();
      if (emailReady) {
        console.log("[Email] Service initialized and ready");
      } else {
        console.warn(`[Email] Service remains ${getEmailServiceStatus().state}; no outbound email will be sent.`);
      }
    } catch (error) {
      console.error("[Email] Failed to initialize email service:", error);
    }
  });
}

startServer().catch(console.error);
