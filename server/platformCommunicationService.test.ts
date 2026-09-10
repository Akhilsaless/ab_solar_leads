import { describe, expect, it } from "vitest";
import { publicPlatformChannel } from "./platformCommunicationService";

describe("platform communication status serialization", () => {
  it("exposes only safe operational status and never returns encrypted configuration", () => {
    const secret = "smtp-password-must-never-reach-client";
    const result = publicPlatformChannel({
      channel: "email",
      provider: "SMTP",
      encryptedConfig: secret,
      configuredFields: JSON.stringify(["host", "password", "from"]),
      status: "off",
      automationState: "off",
      lastErrorMessage: null,
    });
    expect(result).toMatchObject({ channel: "email", configured: true, credentialHint: "Configured securely", configuredFields: ["host", "password", "from"] });
    expect(result).not.toHaveProperty("encryptedConfig");
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
