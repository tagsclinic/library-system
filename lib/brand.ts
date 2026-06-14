export const BRAND = {
  name: "LibraryInventory",
  tagline: "Smart Library Management Made Simple.",
  heroHeadline: "Everything Your Library Needs, In One Place.",
  heroSubheadline:
    "Manage books, borrowers, checkouts, returns, renewals, inventory, and reports from a single platform.",
  primaryColor: "#2563EB",
  secondaryColor: "#1E40AF",
  successColor: "#10B981",
  warningColor: "#F59E0B",
  dangerColor: "#EF4444",
  neutralColor: "#64748B",
  sidebarBg: "#0F172A",
  footerText: "Powered by LibraryInventory",
  copyright: `© ${new Date().getFullYear()} LibraryInventory. All rights reserved.`,
} as const;

export const PRICING = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for small libraries and reading programs",
    features: ["Up to 2,000 books", "Unlimited borrowers", "Checkout & check-in", "Basic reports", "Email support"],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing libraries and schools",
    features: ["Up to 10,000 books", "Advanced analytics", "SMS notifications", "Audit logs", "Priority support"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: " pricing",
    description: "For large institutions and districts",
    features: ["Unlimited books", "White-label branding", "Custom integrations", "Dedicated support", "SLA guarantee"],
    cta: "Request Demo",
    highlighted: false,
  },
] as const;

export const FEATURES = [
  { title: "Book Catalog", description: "Organize your entire collection with barcodes, QR codes, and categories." },
  { title: "Check-Out Management", description: "Streamlined checkout with terms acceptance and receipt printing." },
  { title: "Check-In Management", description: "Condition tracking, damage reports, and instant returns." },
  { title: "Borrower Tracking", description: "Risk scoring and accountability for every borrower." },
  { title: "Due Date Tracking", description: "Automatic overdue detection and reminder notifications." },
  { title: "Renewals", description: "Configurable renewal limits with staff approval workflow." },
  { title: "Reports & Analytics", description: "Six report types with CSV and Excel export." },
  { title: "Barcode Scanning", description: "Auto-generated barcodes and QR codes for every book." },
  { title: "Notifications", description: "Email and SMS alerts via Resend and Twilio." },
  { title: "Audit Logs", description: "Complete activity history with before/after data." },
] as const;

export const BENEFITS = [
  { title: "Reduce Manual Work", description: "Automate checkout, returns, and notifications so staff focus on patrons." },
  { title: "Track Every Book", description: "Know exactly where every title is — checked out, available, or overdue." },
  { title: "Prevent Lost Inventory", description: "Risk scoring and financial tracking reduce lost and damaged books." },
  { title: "Improve Borrower Accountability", description: "Watchlist and blocked statuses keep borrowers responsible." },
  { title: "Simplify Library Operations", description: "One platform replaces spreadsheets, paper logs, and sticky notes." },
] as const;

export const TESTIMONIALS = [
  {
    quote: "LibraryInventory transformed our church library. We went from chaos to complete control in one afternoon.",
    author: "Sarah Mitchell",
    role: "Church Librarian, Grace Community Church",
  },
  {
    quote: "Our school library staff loves the checkout wizard. Even volunteers with no tech experience can use it.",
    author: "James Rodriguez",
    role: "Head Librarian, Oakwood Elementary",
  },
  {
    quote: "The audit logs alone saved us during our annual inventory review. Every action is documented.",
    author: "Dr. Amina Hassan",
    role: "Director, Community Reading Center",
  },
] as const;

export const PLAN_LIMITS: Record<string, number> = {
  STARTER: 2000,
  PROFESSIONAL: 10000,
  ENTERPRISE: Infinity,
};
