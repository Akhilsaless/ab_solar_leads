import { z } from "zod";
import * as db from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { partnerSignups } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { ENV } from "./_core/env";

// drizzle-mysql2: execute() returns [rows, fields] tuple — always extract rows[0]
function rows(result: any): any[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as any[];
  if (Array.isArray(result)) return result as any[];
  return [];
}
function firstRow(result: any): any | null {
  const r = rows(result);
  return r.length > 0 ? r[0] : null;
}

export const partnerManagementRouter = router({
  // Get all partner signups (admin only) - from solarPartners table
  getAllSignups: protectedProcedure.query(async ({ ctx }: any) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    const result = await dbConn.execute(
      sql`SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, products, pricing, discounts, status, signedUpAt FROM solarPartners ORDER BY signedUpAt DESC`
    );
    return (result as any).rows || [];
  }),

  // Get partner signups with filters - from solarPartners table
  getSignups: protectedProcedure
    .input(
      z.object({
        status: z.enum(["new", "contacted", "interested", "converted"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }: any) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const dbConn = await db.getDb();
      if (!dbConn) return [];

      const result = await dbConn.execute(
        sql`SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, products, pricing, discounts, status, signedUpAt FROM solarPartners ORDER BY signedUpAt DESC`
      );
      let data = (result as any).rows || [];

      // Filter by search if provided
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        data = data.filter(
          (p: any) =>
            p.companyName?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower) ||
            p.phone?.toLowerCase().includes(searchLower)
        );
      }

      return data;
    }),

  // Get single partner signup
  getSignup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }: any) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      const result = await dbConn.execute(
        sql`SELECT id, companyName, email, phone, whatsappNumber, serviceAreas, products, pricing, discounts, status, signedUpAt FROM solarPartners WHERE id = ${input.id}`
      );
      const data = rows(result);
      return data.length > 0 ? data[0] : null;
    }),

  // Update partner signup status
  updateSignupStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["new", "contacted", "interested", "converted"]),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      await dbConn.execute(
        sql`UPDATE solarPartners SET status = ${input.status} WHERE id = ${input.id}`
      );

      return { success: true };
    }),

  // Generate unique partner link
  generatePartnerLink: protectedProcedure
    .input(z.object({ partnerId: z.string() }))
    .query(({ input: inp }: any) => {
      const partnerSlug = inp.partnerId.toLowerCase().replace(/\s+/g, "-");
      return {
        link: `${ENV.publicAppUrl}/partner/${partnerSlug}`,
      };
    }),

  // Delete partner signup
  deleteSignup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }: any) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const dbConn = await db.getDb();
      if (!dbConn) throw new Error("Database connection failed");
      await dbConn.execute(
        sql`DELETE FROM solarPartners WHERE id = ${input.id}`
      );

      return { success: true };
    }),
});
