import { z } from "zod";

import {
  BookCondition,
  BookStatus,
  BorrowerStatus,
  LoanPeriodType,
  LoanStatus,
  PaymentStatus,
} from "@prisma/client";

export const bookSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  author: z.string().min(1, "Author is required").max(500),
  category: z.string().max(200).optional().nullable(),
  isbn: z.string().max(20).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  replacementValue: z.coerce.number().min(0).optional().nullable(),
  currentCondition: z.nativeEnum(BookCondition).default(BookCondition.GOOD),
  status: z.nativeEnum(BookStatus).default(BookStatus.AVAILABLE),
  notes: z.string().max(2000).optional().nullable(),
  publishedYear: z.coerce
    .number()
    .int()
    .min(1000)
    .max(new Date().getFullYear() + 1)
    .optional()
    .nullable(),
  publisher: z.string().max(500).optional().nullable(),
  edition: z.string().max(100).optional().nullable(),
});

export const bookUpdateSchema = bookSchema.partial();

export const borrowerSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(200),
  phone: z
    .string()
    .min(7, "Phone number is required")
    .max(20)
    .regex(/^[\d\s\-+()]+$/, "Invalid phone number format"),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.nativeEnum(BorrowerStatus).default(BorrowerStatus.ACTIVE),
});

export const borrowerUpdateSchema = borrowerSchema.partial();

export const checkoutSchema = z
  .object({
    bookId: z.string().cuid("Invalid book ID"),
    borrowerId: z.string().cuid("Invalid borrower ID"),
    loanPeriodType: z.nativeEnum(LoanPeriodType),
    customDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
    checkoutCondition: z.nativeEnum(BookCondition),
    checkoutNotes: z.string().max(2000).optional().nullable(),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "Terms and conditions must be accepted" }),
    }),
    termsVersion: z.string().default("1.0"),
  })
  .refine(
    (data) =>
      data.loanPeriodType !== LoanPeriodType.CUSTOM ||
      (data.customDays !== null && data.customDays !== undefined && data.customDays > 0),
    {
      message: "Custom loan period requires a valid number of days",
      path: ["customDays"],
    }
  );

export const checkinSchema = z.object({
  loanId: z.string().cuid("Invalid loan ID"),
  returnCondition: z.nativeEnum(BookCondition),
  returnNotes: z.string().max(2000).optional().nullable(),
  repairCost: z.coerce.number().min(0).optional().nullable(),
  amountOwed: z.coerce.number().min(0).optional().nullable(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional().nullable(),
  markAsLost: z.boolean().default(false),
  markAsDamaged: z.boolean().default(false),
});

export const renewalSchema = z.object({
  loanId: z.string().cuid("Invalid loan ID"),
  loanPeriodType: z.nativeEnum(LoanPeriodType),
  customDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  reason: z.string().max(1000).optional().nullable(),
});

export const renewalApprovalSchema = renewalSchema.extend({
  approved: z.boolean(),
});

export const appSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(0),
  description: z.string().max(500).optional().nullable(),
});

export const appSettingsUpdateSchema = z.record(z.string(), z.string());

export const notificationTemplateSchema = z.object({
  type: z.enum([
    "DUE_SOON",
    "OVERDUE",
    "RENEWAL_APPROVED",
    "LOST_NOTICE",
    "DAMAGE_NOTICE",
  ]),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z
    .enum(["all", "books", "borrowers", "loans"])
    .optional()
    .default("all"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type BookInput = z.infer<typeof bookSchema>;
export type BookUpdateInput = z.infer<typeof bookUpdateSchema>;
export type BorrowerInput = z.infer<typeof borrowerSchema>;
export type BorrowerUpdateInput = z.infer<typeof borrowerUpdateSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type RenewalInput = z.infer<typeof renewalSchema>;
export type AppSettingInput = z.infer<typeof appSettingSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
