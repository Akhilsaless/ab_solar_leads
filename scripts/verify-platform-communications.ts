import { appRouter } from "../server/routers";
import { getPlatformDispatchDecision, getPlatformSafetyControl } from "../server/platformCommunicationService";
import { ENV } from "../server/_core/env";

async function run() {
  const ownerCaller = appRouter.createCaller({ user: { id: 1, openId: ENV.ownerOpenId, role: "admin" } } as any);
  const nonOwnerCaller = appRouter.createCaller({ user: { id: 2, openId: "platform-control-permission-test", role: "user" } } as any);
  const [status, emailDispatch, whatsappDispatch, safety] = await Promise.all([
    ownerCaller.platformCommunications.status(),
    getPlatformDispatchDecision("email"),
    getPlatformDispatchDecision("whatsapp"),
    getPlatformSafetyControl(),
  ]);
  const serialized = JSON.stringify(status);
  if (status.email.configured || status.whatsapp.configured) throw new Error("Unexpected configured provider in the current no-credential state.");
  if (status.email.automationState !== "off" || status.whatsapp.automationState !== "off") throw new Error("A platform channel is not OFF.");
  if (!safety.emergencyStopActive) throw new Error("Emergency stop must remain active before release approval.");
  if (emailDispatch.allowed || whatsappDispatch.allowed) throw new Error("A communication dispatch path is unexpectedly allowed.");
  if (serialized.includes("encryptedConfig") || serialized.includes("accessToken") || serialized.includes("password")) throw new Error("Unsafe credential field appeared in the platform status response.");
  let nonOwnerDenied = false;
  try {
    await nonOwnerCaller.platformCommunications.status();
  } catch (error: any) {
    nonOwnerDenied = error?.code === "FORBIDDEN";
  }
  if (!nonOwnerDenied) throw new Error("A non-owner can access platform communication status.");
  console.log(JSON.stringify({
    platformStatus: "pass",
    ownerStatusAccessible: true,
    nonOwnerDenied,
    email: { status: status.email.status, state: status.email.automationState, dispatchAllowed: emailDispatch.allowed },
    whatsapp: { status: status.whatsapp.status, state: status.whatsapp.automationState, dispatchAllowed: whatsappDispatch.allowed },
    emergencyStopActive: safety.emergencyStopActive,
    credentialFieldsExposed: false,
  }, null, 2));
}

run().then(() => process.exit(0)).catch((error) => { console.error(error.message); process.exit(1); });
