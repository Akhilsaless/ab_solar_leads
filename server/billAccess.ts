import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hash } from "./followup/policy";
const rows = (r: any): any[] => (Array.isArray(r?.[0]) ? r[0] : []);
export async function registerBillUpload(
  db: any,
  sessionId: string,
  url: string,
  contentType: string
) {
  await db.transaction(async (tx: any) => {
    await tx.execute(
      sql`SELECT id FROM conversations3 WHERE sessionId = ${sessionId} FOR UPDATE`
    );
    const used = rows(
      await tx.execute(
        sql`SELECT COUNT(*) AS count FROM solarBillUploadReceipts WHERE sessionId = ${sessionId} AND createdAt > DATE_SUB(NOW(), INTERVAL 1 DAY)`
      )
    )[0];
    if (Number(used.count) >= 3)
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message:
          "Daily bill-upload limit reached. Please enter the bill amount instead.",
      });
    await tx.execute(
      sql`INSERT INTO solarBillUploadReceipts (urlHash, sessionId, contentType) VALUES (${hash(url)}, ${sessionId}, ${contentType})`
    );
  });
}
export async function claimBillRead(db: any, sessionId: string, url: string) {
  return db.transaction(async (tx: any) => {
    const receipt = rows(
      await tx.execute(
        sql`SELECT * FROM solarBillUploadReceipts WHERE urlHash = ${hash(url)} AND sessionId = ${sessionId} AND createdAt > DATE_SUB(NOW(), INTERVAL 1 DAY) FOR UPDATE`
      )
    )[0];
    if (!receipt)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Upload this bill in your own chat session first.",
      });
    if (receipt.result)
      return {
        cached: JSON.parse(receipt.result),
        contentType: receipt.contentType,
      };
    if (Number(receipt.attempts) >= 1)
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message:
          "This bill has already been submitted. Type the bill amount if extraction failed.",
      });
    await tx.execute(
      sql`UPDATE solarBillUploadReceipts SET attempts = attempts + 1 WHERE urlHash = ${hash(url)}`
    );
    return { cached: null, contentType: receipt.contentType };
  });
}
export async function cacheBillRead(
  db: any,
  sessionId: string,
  url: string,
  result: unknown
) {
  await db.execute(
    sql`UPDATE solarBillUploadReceipts SET result = ${JSON.stringify(result)} WHERE urlHash = ${hash(url)} AND sessionId = ${sessionId}`
  );
}

export async function finalizeBillUpload(
  db: any,
  sessionId: string,
  storageKey: string,
  url: string
) {
  await db.execute(
    sql`UPDATE solarBillUploadReceipts SET urlHash = ${hash(url)} WHERE urlHash = ${hash(storageKey)} AND sessionId = ${sessionId}`
  );
}
