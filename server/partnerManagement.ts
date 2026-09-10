import { z } from "zod";
import * as db from "./db";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { ENV } from "./_core/env";
import { isPlatformSuperAdmin } from "./platformCommunicationState";
import { assignLead, listAssignableAgencies, listSuperAdminLeadInbox } from "./leadAssignment";

function rows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray((result as any)?.rows)) return (result as any).rows;
  if (Array.isArray(result)) return result as any[];
  return [];
}

const superAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!isPlatformSuperAdmin(ctx.user, ENV.ownerOpenId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform owner access required" });
  }
  return next({ ctx });
});

export const partnerManagementRouter = router({
  getAllSignups: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    const result = await dbConn.execute(sql`
      SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, products, pricing, discounts, status, signedUpAt
      FROM solarPartners ORDER BY signedUpAt DESC
    `);
    return rows(result);
  }),

  getSignups: protectedProcedure
    .input(z.object({ status: z.enum(["new", "contacted", "interested", "converted"]).optional(), search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      let data = rows(await dbConn.execute(sql`
        SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, products, pricing, discounts, status, signedUpAt
        FROM solarPartners ORDER BY signedUpAt DESC
      `));
      if (input.status) data = data.filter((p: any) => p.status === input.status);
      if (input.search) {
        const search = input.search.toLowerCase();
        data = data.filter((p: any) => [p.companyName, p.email, p.phone].some(v => String(v || "").toLowerCase().includes(search)));
      }
      return data;
    }),

  getSignup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      return rows(await dbConn.execute(sql`
        SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, products, pricing, discounts, status, signedUpAt
        FROM solarPartners WHERE id = ${input.id} LIMIT 1
      `))[0] || null;
    }),

  updateSignupStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.enum(["new", "contacted", "interested", "converted"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      await dbConn.execute(sql`UPDATE solarPartners SET status = ${input.status} WHERE id = ${input.id}`);
      return { success: true };
    }),

  generatePartnerLink: protectedProcedure
    .input(z.object({ partnerId: z.string() }))
    .query(({ input }) => ({ link: `${ENV.publicAppUrl}/partner/${input.partnerId.toLowerCase().replace(/\s+/g, "-")}` })),

  deleteSignup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      await dbConn.execute(sql`DELETE FROM solarPartners WHERE id = ${input.id}`);
      return { success: true };
    }),

  leadInbox: superAdminProcedure
    .input(z.object({ assignmentStatus: z.enum(["UNASSIGNED", "ASSIGNED", "REASSIGNED"]).optional() }).optional())
    .query(async ({ input }) => listSuperAdminLeadInbox(input?.assignmentStatus)),

  assignableAgencies: superAdminProcedure.query(async () => listAssignableAgencies()),

  assignLeadToAgency: superAdminProcedure
    .input(z.object({ leadId: z.number().int().positive(), agencyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => assignLead({ leadId: input.leadId, agencyId: input.agencyId, actorUserId: ctx.user!.id })),
});
