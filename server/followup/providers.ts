import type { FollowupConfig } from "./policy";
export async function startVoice(
  config: FollowupConfig,
  phone: string,
  callbackUrl: string
) {
  if (!config.voiceKey) throw new Error("voice_key_required");
  const r = await fetch(
    `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(config.orgId)}/workspaces/${encodeURIComponent(config.workspaceId)}/outbounds`,
    {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        "X-API-Key": config.voiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_config: {
          app_id: config.appId,
          app_version: config.appVersion,
          connection_config: {
            connection_id: config.connectionId,
            agent_phone_number: config.agentPhone,
          },
        },
        user_config: { user_phone_number: phone },
        webhook_config: { url: callbackUrl },
      }),
    }
  );
  if (!r.ok)
    throw Object.assign(new Error("voice_provider_rejected"), {
      status: r.status,
    });
  const value = await r.json();
  if (typeof value.attempt_id !== "string")
    throw new Error("voice_response_unknown");
  return value.attempt_id as string;
}
export async function submitBill(key: string, bytes: Uint8Array, mime: string) {
  if (!["image/jpeg", "image/png"].includes(mime))
    throw new Error("single_bill_image_required");
  const fields = {
    amount: [
      "number",
      "Current billing period electricity amount INR, exclude arrears",
    ],
    units: ["number", "Units consumed kWh in this billing period"],
    consumer_number: [
      "string",
      "Electricity consumer or service account number",
    ],
    sanctioned_load_kw: ["number", "Sanctioned connected load in kW"],
    discom: ["string", "Electricity distribution company name"],
  };
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(bytes)], { type: mime }),
    mime === "image/png" ? "bill.png" : "bill.jpg"
  );
  form.append(
    "schema",
    JSON.stringify({
      type: "object",
      properties: Object.fromEntries(
        Object.entries(fields).map(([name, [type, description]]) => [
          name,
          { type, description },
        ])
      ),
    })
  );
  form.append("output_format", "json");
  const r = await fetch("https://api.sarvam.ai/doc-ai/v1/job/extract", {
    method: "POST",
    headers: { "api-subscription-key": key },
    body: form,
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw Object.assign(new Error("bill_provider_rejected"), {
      status: r.status,
    });
  const result = await r.json();
  if (typeof result.job_id !== "string")
    throw new Error("bill_response_unknown");
  return result.job_id as string;
}
export async function billResult(key: string, jobId: string) {
  const base = `https://api.sarvam.ai/doc-ai/v1/job/${encodeURIComponent(jobId)}`;
  const get = async (path: string) => {
    const r = await fetch(`${base}/${path}`, {
      headers: { "api-subscription-key": key },
      redirect: "error",
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error("bill_poll_failed");
    return r.json();
  };
  const status = await get("status");
  if (status.status === "completed")
    return { status: "completed", data: await get("results") };
  return { status: status.status, data: null };
}
export async function boundedImage(r: Response) {
  const mime = r.headers.get("content-type")?.split(";")[0] || "";
  if (
    !r.ok ||
    !["image/jpeg", "image/png"].includes(mime) ||
    Number(r.headers.get("content-length") || 0) > 5 * 1024 * 1024 ||
    !r.body
  )
    throw new Error("invalid_bill_image");
  const chunks: Uint8Array[] = [];
  let length = 0;
  const reader = r.body.getReader();
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.length;
      if (length > 5 * 1024 * 1024) throw new Error("bill_too_large");
      chunks.push(item.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = Buffer.concat(chunks);
  if (
    mime === "image/jpeg"
      ? !(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
      : !bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("invalid_image_signature");
  return { bytes, mime };
}
