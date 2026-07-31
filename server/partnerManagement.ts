import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { partnerSignups } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const partnerManagementRouter = router({
  // Get all partner signups (admin only)
  getAllSignups: protectedProcedure.query(async ({ ctx }: any) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
      return await (db as any).query.partnerSignups.findMany({
      orderBy: [desc(partnerSignups.createdAt)],
    });
  }),

  // Get partner signups with filters
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

      let query = (db as any).query.partnerSignups.findMany({
        orderBy: [desc(partnerSignups.createdAt)],
      });

      // Filter by status if provided
      if (input.status) {
        query = (db as any).query.partnerSignups.findMany({
          where: eq(partnerSignups.status, input.status),
          orderBy: [desc(partnerSignups.createdAt)],
        });
      }

      const results = await query;

      // Filter by search if provided
      if (input.search) {
        const searchLower = input.search.toLowerCase();
      return results.filter(
        (p: any) =>
            p.companyName?.toLowerCase().includes(searchLower) ||
            p.contactName?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower)
        );
      }

      return results;
    }),

  // Get single partner signup
  getSignup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }: any) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await (db as any).query.partnerSignups.findFirst({
        where: eq(partnerSignups.id, input.id),
      });
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

      await (db as any)
        .update(partnerSignups)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(partnerSignups.id, input.id));

      return { success: true };
    }),

  // Generate unique partner link
  generatePartnerLink: protectedProcedure
    .input(z.object({ partnerId: z.string() }))
    .query(({ input: inp }: any) => {
      const origin = process.env.VITE_FRONTEND_URL || "https://salessquad.manus.space";
      const partnerSlug = inp.partnerId.toLowerCase().replace(/\s+/g, "-");
      return {
        link: `${origin}/partner/${partnerSlug}`,
        slug: partnerSlug,
      };
    }),

  // Get partner by slug (public)
  getPartnerBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input: inp }: any) => {
      const partner = await (db as any).query.partnerSignups.findFirst({
        where: eq(partnerSignups.partnerSlug, inp.slug),
      }) as any;

      if (!partner) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partner not found",
        });
      }

      return {
        id: partner.id,
        companyName: partner.companyName,
        contactName: partner.contactName,
        email: partner.email,
        phone: partner.phone,
      };
    }),

  // Delete a partner signup
  deleteSignup: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }: any) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await dbConn.execute(sql`DELETE FROM partnerSignups WHERE id = ${input.id}`);
      return { success: true };
    }),

  // Create partner signup
  createSignup: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        contactName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(10),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        panNumber: z.string().optional(),
        gstNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input: inp }: any) => {
      const partnerSlug = inp.companyName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const result = await (db as any).insert(partnerSignups).values({
        companyName: inp.companyName,
        contactName: inp.contactName,
        email: inp.email,
        phone: inp.phone,
        address: inp.address,
        city: inp.city,
        state: inp.state,
        panNumber: inp.panNumber,
        gstNumber: inp.gstNumber,
        partnerSlug,
        status: "new" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        partnerId: result[0]?.id || "",
        partnerLink: `${process.env.VITE_FRONTEND_URL || "https://salessquad.manus.space"}/partner/${partnerSlug}`,
      };
    }),
});
