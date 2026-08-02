import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeEmailService } from "./emailService";
import { followUpEmailsHandler } from "../followUpEmailHandler";
import { adminDigestHandler } from "../adminDigestHandler";
import { referrerOnboardingHandler } from "../referrerOnboardingHandler";

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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for uploaded assets
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Follow-up email scheduler (cron-only endpoint)
  app.post("/api/scheduled/followUpEmails", followUpEmailsHandler);
  // Admin daily digest (cron-only endpoint)
  app.post("/api/scheduled/adminDigest", adminDigestHandler);
  // Referrer onboarding email sequence (cron-only endpoint)
  app.post("/api/scheduled/referrerOnboarding", referrerOnboardingHandler);

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
        console.warn("[Email] Service initialized but SMTP verification failed - emails may not send");
      }
    } catch (error) {
      console.error("[Email] Failed to initialize email service:", error);
    }
  });
}

startServer().catch(console.error);
