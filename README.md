# LibraryOS — Library Management System

A production-grade library book check-in/check-out management system built with Next.js 15, Supabase, and Prisma.

## Features

- **Book Management** — Full catalog with barcode/QR generation, condition tracking, cover images
- **Checkout & Check-In** — 4-step checkout with T&C agreement, condition comparison, receipt printing
- **Borrower Management** — Risk engine (overdue × 3, lost × 5, damaged × 2 scoring), status flags
- **Renewals** — Configurable max renewals with staff approval and auto-notifications
- **Reports** — 6 report types, CSV + Excel export
- **Notifications** — Email (Resend) + SMS (Twilio), with graceful NOT_CONFIGURED handling
- **Audit Trail** — Every action logged with before/after data
- **Dashboard** — 8 stat cards, monthly bar chart, category pie chart, activity feed
- **Global Search** — Books, borrowers, loans, ISBN, barcode, categories
- **Role-Based Auth** — Admin / Librarian / Viewer via Supabase Auth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | Supabase Auth |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Email | Resend |
| SMS | Twilio |
| Icons | Lucide React |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_ORG/library-system.git
cd library-system
npm install
```

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to provision
3. Go to **Settings → Database → Connection String**
4. Copy the **URI** (with pgbouncer) as `DATABASE_URL`
5. Copy the **Direct connection URI** as `DIRECT_URL`
6. Go to **Settings → API**
7. Copy `Project URL` as `NEXT_PUBLIC_SUPABASE_URL`
8. Copy `anon public` key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
9. Copy `service_role secret` key as `SUPABASE_SERVICE_ROLE_KEY`

#### Create Auth Users

In Supabase Dashboard → Authentication → Users → Add User:

| Email | Password | Role (in user_metadata) |
|---|---|---|
| admin@library.com | admin123 | ADMIN |
| librarian@library.com | lib123 | LIBRARIAN |
| viewer@library.com | view123 | VIEWER |

To set role in user_metadata, use the Supabase SQL editor:
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"ADMIN"')
WHERE email = 'admin@library.com';

UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{full_name}', '"Library Admin"')
WHERE email = 'admin@library.com';

-- Repeat for other users with LIBRARIAN and VIEWER roles
```

#### Create Storage Bucket

In Supabase Dashboard → Storage → Create Bucket:
- Name: `book-covers`
- Public: Yes

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# Optional - leave blank to show "Not Configured"
RESEND_API_KEY=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (first time)
npm run db:push

# Seed with sample data (24 books, 10 borrowers, loans)
npm run db:seed
```

### 5. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial production deployment"
git remote add origin https://github.com/YOUR_ORG/library-system.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)
4. Add all environment variables from `.env.local`
5. Change `NEXT_PUBLIC_APP_URL` to your Vercel domain
6. Deploy

### 3. Post-Deploy Database Migration

After deploying, run migrations against your production database:

```bash
npx prisma migrate deploy
npm run db:seed  # Optional: seed production data
```

---

## Project Structure

```
library-system/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # All protected pages
│   │   ├── layout.tsx         # Sidebar + Topbar
│   │   ├── dashboard/         # Dashboard with charts
│   │   ├── books/             # Book catalog, detail, add, edit
│   │   ├── checkout/          # Checkout wizard
│   │   ├── checkin/           # Return books
│   │   ├── borrowers/         # Borrower management
│   │   ├── reports/           # 6 report types with export
│   │   ├── notifications/     # Email/SMS log
│   │   ├── audit/             # Complete audit trail
│   │   └── settings/          # System config + templates
│   └── api/                   # REST API routes
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── shared/                # Sidebar, Topbar, Badges
│   └── dashboard/             # Dashboard client component
├── lib/
│   ├── supabase/              # Client + server Supabase
│   ├── services/              # barcode, notifications, audit
│   ├── utils.ts               # Formatters, helpers
│   ├── validations.ts         # Zod schemas
│   ├── auth.ts                # Role helpers
│   └── prisma.ts              # Prisma singleton
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Sample data
├── hooks/
│   └── use-toast.ts           # Toast hook
└── middleware.ts              # Auth route protection
```

---

## Role Permissions

| Feature | Admin | Librarian | Viewer |
|---|:---:|:---:|:---:|
| View books/borrowers/loans | ✓ | ✓ | ✓ |
| Add/edit books | ✓ | ✓ | ✗ |
| Checkout / Check-In | ✓ | ✓ | ✗ |
| Manage borrowers | ✓ | ✓ | ✗ |
| Process renewals | ✓ | ✓ | ✗ |
| View reports | ✓ | ✓ | ✓ |
| Send notifications | ✓ | ✓ | ✗ |
| View audit log | ✓ | ✓ | ✗ |
| Manage settings | ✓ | ✗ | ✗ |

---

## Notification Setup

### Email (Resend)
1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your sending domain
4. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`

### SMS (Twilio)
1. Sign up at [twilio.com](https://console.twilio.com)
2. Get a phone number
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

If either provider is not configured, the system shows "NOT_CONFIGURED" in the notification log instead of failing.

---

## Database Schema

Key models:
- **Book** — title, author, barcode, QR, condition, status, cover image
- **Borrower** — contact info, status (Active/Watchlist/Blocked), risk scoring
- **Loan** — checkout/return dates, conditions, T&C acceptance, financial tracking
- **Renewal** — per-loan renewal history with approval
- **ConditionHistory** — timeline of book condition changes
- **NotificationLog** — all sent/failed notifications with retry
- **AuditLog** — complete action history with before/after JSON
- **AppSettings** — key-value config (library name, max renewals, etc.)
- **NotificationTemplate** — editable email/SMS templates per notification type

---

## Verification Checklist

Before marking production-ready:

- [ ] ✓ Authentication works (login/logout with roles)
- [ ] ✓ Database connected (Prisma + Supabase PostgreSQL)
- [ ] ✓ Book checkout works (4-step form + T&C + receipt)
- [ ] ✓ Book check-in works (condition comparison + damage/lost handling)
- [ ] ✓ Renewals work (max renewals enforcement + notifications)
- [ ] ✓ Reports work (6 types, CSV + Excel export)
- [ ] ✓ Search works (global across books/borrowers/loans/barcodes)
- [ ] ✓ Dashboard works (stats, charts, due soon, recent activity)
- [ ] ✓ Audit logging works (every CRUD + checkout/return)
- [ ] ✓ Barcode generation works (SVG on book creation)
- [ ] ✓ QR generation works (data URL on book creation)
- [ ] ✓ Responsive design works (sidebar on desktop, stacked on mobile)
- [ ] ✓ Notifications show NOT_CONFIGURED when providers absent
- [ ] ✓ Risk engine calculates borrower risk scores
- [ ] ✓ Financial tracking on damaged/lost loans

---

## Development Notes

### Adding New Book Categories
Edit the seed file or add via the UI — categories are free-form text fields, grouped automatically in reports and the dashboard pie chart.

### Customizing Notification Templates
Go to Settings → Notification Templates. Supported variables:
- `{borrowerName}` `{title}` `{author}` `{dueDate}` `{newDueDate}` `{libraryName}` `{replacementValue}` `{repairCost}` `{loanId}` `{returnDate}`

### Running Database Migrations
```bash
# Development
npx prisma migrate dev --name describe_change

# Production
npx prisma migrate deploy
```

### Resetting Seed Data
```bash
npm run db:seed  # Clears all data then re-seeds
```
