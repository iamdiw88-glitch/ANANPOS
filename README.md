# ANANPOS

A construction materials POS system built with Next.js, Prisma, and PostgreSQL. Designed for hardware/building-supply stores with multi-unit product tracking, credit customers, and delivery management.

## Features

- **Point of Sale** — fast product search, multi-unit selling (bag/pallet/ton), retail & contractor pricing, thermal receipt printing
- **Inventory** — stock balances, stock movement history, reorder points
- **Accounts Receivable** — credit invoices, payment tracking, aging report
- **Purchases** — purchase orders from suppliers, stock-in on receipt
- **Deliveries** — delivery board with COD support, driver/vehicle assignment
- **Returns** — customer returns with cash or credit-note refund
- **Reports** — daily sales, inventory snapshot, AR aging
- **Settings** — shop info, VAT rate, backup

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth v5 (PIN-based)
- **UI**: Tailwind CSS, Lucide icons, Sonner toasts
- **PDF**: @react-pdf/renderer for tax invoices
- **Printing**: react-thermal-printer

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET

# Push schema and seed
npx prisma db push
npx prisma db seed

# Start dev server
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | Direct PostgreSQL connection (for migrations) |
| `NEXTAUTH_SECRET` | Random secret for session signing |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |

## Deploying to Vercel + Supabase

1. **Create a Supabase project** and grab the connection strings from Project Settings → Database:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`, with `?pgbouncer=true&connection_limit=1` appended
   - **Direct connection** (port 5432) → `DIRECT_URL`
2. **Push the schema** to Supabase (run locally, pointed at Supabase):
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
3. **Import the repo into Vercel** and set the environment variables (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` set to your production domain) in Project Settings → Environment Variables.
4. Vercel runs `npm install` (which triggers `prisma generate` via `postinstall`) then `next build` automatically — no extra build configuration needed.

Notes:
- The Prisma client uses a singleton (`lib/prisma.ts`) so serverless function invocations reuse connections instead of exhausting the database's connection limit.
- `pg_dump`-based backup (`/api/settings/backup`) only works on a server with `pg_dump` installed; on Vercel it returns a 501 — use Supabase's built-in Backups / Point-in-Time Recovery instead.

## Project Structure

```
app/
  (auth)/login/        # PIN login
  (main)/
    pos/               # Point of sale
    inventory/         # Stock management
    purchases/         # Purchase orders
    ar/                # Accounts receivable
    delivery/          # Delivery board
    returns/           # Customer returns
    reports/           # Daily / inventory / aging
    settings/          # Shop configuration
  api/                 # Route handlers
components/            # Feature UI components
lib/                   # Auth config, utilities
prisma/
  schema.prisma        # Database schema
  seed.ts              # Initial data seed
```

## User Roles

| Role | Access |
|---|---|
| `OWNER` | Full access |
| `CASHIER` | POS, deliveries |
| `STAFF` | Inventory, purchases |
