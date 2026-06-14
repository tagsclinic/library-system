# CLAUDE.md — LibraryOS Codebase Guide

## Project Overview

LibraryOS is a production-grade library book check-in/check-out management system. Staff manage books, borrowers, loans, renewals, reports, notifications, and audit trails through a role-based dashboard.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | Supabase Auth (Admin / Librarian / Viewer) |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Email | Resend |
| SMS | Twilio |

## Directory Structure

```
app/
  (auth)/login/              # Login page
  (dashboard)/               # Protected pages (sidebar + topbar layout)
    dashboard/               # Stats, charts, activity feed
    books/                   # Catalog, detail, add, edit
    checkout/                # 4-step checkout wizard
    checkin/                 # Return books
    borrowers/               # Borrower management
    reports/                 # 6 report types + export
    notifications/           # Email/SMS log
    audit/                   # Audit trail
    settings/                # System config + templates
  api/                       # REST API routes
components/
  ui/                        # shadcn/ui components
  shared/                    # Sidebar, Topbar, Badges
  dashboard/                 # Dashboard client components
lib/
  supabase/                  # Client + server Supabase helpers
  services/                  # barcode, notifications, audit
  utils.ts                   # Formatters, helpers
  validations.ts             # Zod schemas
  auth.ts                    # Role helpers
  prisma.ts                  # Prisma singleton
prisma/
  schema.prisma              # Database schema (source of truth)
  seed.ts                    # Sample data
hooks/
middleware.ts                # Auth route protection
types/
```

## Auth & Roles

Roles live in Supabase `user_metadata.role`: `ADMIN`, `LIBRARIAN`, `VIEWER`.

| Feature | Admin | Librarian | Viewer |
|---------|:-----:|:---------:|:------:|
| View books/borrowers/loans | ✓ | ✓ | ✓ |
| Add/edit books, checkout/check-in | ✓ | ✓ | ✗ |
| Manage borrowers, renewals | ✓ | ✓ | ✗ |
| View reports | ✓ | ✓ | ✓ |
| Send notifications | ✓ | ✓ | ✗ |
| View audit log | ✓ | ✓ | ✗ |
| Manage settings | ✓ | ✗ | ✗ |

**Server auth pattern:**
```ts
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const role = getUserRole(user);
if (!canManageBooks(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

## Database (Prisma)

Schema is in `prisma/schema.prisma`. Use the singleton from `lib/prisma.ts`.

Key models: `Book`, `Borrower`, `Loan`, `Renewal`, `ConditionHistory`, `NotificationLog`, `AuditLog`, `AppSettings`, `NotificationTemplate`.

```ts
import { prisma } from "@/lib/prisma";

const books = await prisma.book.findMany({
  where: { status: "AVAILABLE" },
  orderBy: { title: "asc" },
});
```

After schema changes:
```bash
npm run db:generate   # Regenerate Prisma client
npm run db:push       # Dev: push schema to Supabase
npx prisma migrate dev --name describe_change  # Dev with migration file
npm run db:migrate    # Prod: deploy migrations
```

## API Routes

- Validate all inputs with Zod (`lib/validations.ts`) via `safeParse`
- Return `{ error: "message" }` with appropriate HTTP status codes
- Log CRUD and loan actions to `AuditLog` via `lib/services/audit`
- Check role permissions before mutating data
- Use `NOT_CONFIGURED` notification status when Resend/Twilio env vars are absent — never fail silently or crash

## Domain Rules

- **Checkout**: 4-step wizard, T&C acceptance, condition recording, barcode/QR on books
- **Check-in**: Condition comparison, damage/lost handling, financial tracking (`repairCost`, `amountOwed`, `paymentStatus`)
- **Renewals**: Enforce max renewals from `AppSettings`, staff approval, auto-notifications
- **Borrower risk**: Score = overdue×3 + lost×5 + damaged×2; status flags Active / Watchlist / Blocked
- **Barcodes/QR**: Generated on book creation via `lib/services/barcode`

## Forms

Use `react-hook-form` + `zodResolver`. Colocate Zod schemas in `lib/validations.ts` or feature-specific files.

## Dev Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # prisma generate
npm run db:push      # Push schema (dev)
npm run db:seed      # Seed sample data
npm run db:studio    # Prisma Studio
```

## Environment Variables

See `.env.example`. Required: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`. Optional: `RESEND_API_KEY`, `TWILIO_*`.

## Commit Format

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

## Anti-Patterns

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Never skip audit logging on CRUD or loan lifecycle actions
- Never hard-fail when notification providers are unconfigured
- Never bypass role checks in API routes
- Never write raw SQL when Prisma can express the query
- Avoid duplicating Zod schemas — centralize in `lib/validations.ts`
