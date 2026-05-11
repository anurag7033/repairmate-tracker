## Customers Section — Implementation Plan

### 1. Database (migration)

**New table `customers`:**
- `id` uuid PK
- `name` text
- `phone` text **UNIQUE** (normalized last 10 digits) — prevents duplicates
- `email` text nullable
- `address` text nullable
- `notes` text nullable
- `created_at`, `updated_at`

**Link repairs:**
- Add `customer_id` uuid nullable FK on `repair_orders` (keep existing `customer_name`/`customer_phone` for back-compat & existing records).
- Backfill: create `customers` rows from distinct phones in `repair_orders` and set `customer_id`.
- Trigger on `repair_orders` insert/update: if `customer_id` null but phone present → upsert customer by phone, set `customer_id`. Keeps everything in sync without breaking existing flows.

**RLS:** authenticated full access (matches existing admin model). No public read (PII).

**View / RPC** `get_customers_with_stats()` returning:
- customer fields + `total_repairs`, `pending_repairs` (status not in delivered/returned), `last_visit` (max created_at), `total_spent` (sum quotation - discount where paid).

### 2. Frontend

**Types** (`src/types/customer.ts`): `Customer`, `CustomerWithStats`.

**Store** (`src/lib/customerStore.ts`):
- `getCustomersWithStats()`, `getCustomerById(id)`, `getRepairsByCustomerId(id)`
- `createCustomer(data)` — checks duplicate by phone, returns existing if match
- `updateCustomer(id, data)`
- `searchCustomers(query)` — by name/phone

**Admin Dashboard** (`src/pages/AdminDashboard.tsx`):
- Add new tab **"Customers"** alongside existing tabs (the project uses tabbed admin per memory).
- Tab content = `<CustomersSection />`.

**New components:**
- `src/components/admin/CustomersSection.tsx` — table with search, sort (latest / most repairs), badges, empty state, loading skeletons. Row click → opens details.
- `src/components/admin/CustomerDetailsDialog.tsx` (or full page `/admin/customers/:id`) — profile + repair history table with status & payment badges, click repair → existing repair edit/invoice.
- `src/components/admin/CustomerPickerField.tsx` — searchable combobox used in the new-repair form. Shows matching customers, "+ Add New Customer" inline option that opens a small create modal. On select → auto-fills name/phone/email/address in the parent repair form.

**Repair form integration:**
- Locate the existing "new repair entry" form (in `AdminDashboard.tsx` or a sub-component). Replace the manual name+phone inputs with `CustomerPickerField` while keeping email/address fields editable. On save, pass `customer_id` along with existing fields (DB trigger also covers fallback).

**Status badges:** reuse existing `STATUS_LABELS` and color logic from current admin pills for consistency across Completed / Pending / Returned / Delivered / Payment Due / Paid.

### 3. Sync guarantees
- Editing a customer updates name/phone everywhere via JOIN on `customer_id` for new views; existing denormalized `customer_name`/`customer_phone` on repair rows kept as historical snapshot (typical billing practice). Customer page always shows live customer record; repair list keeps showing repair-time snapshot — documented in code.
- Trigger ensures every new repair links to a customer row.

### 4. Out of scope / non-goals
- Not changing customer-facing tracking pages.
- Not changing invoice format.
- Not adding auth/roles changes.

### Files to create/edit
- migration (new)
- `src/types/customer.ts` (new)
- `src/lib/customerStore.ts` (new)
- `src/components/admin/CustomersSection.tsx` (new)
- `src/components/admin/CustomerDetailsDialog.tsx` (new)
- `src/components/admin/CustomerPickerField.tsx` (new)
- `src/pages/AdminDashboard.tsx` (edit — add tab, swap repair form name/phone inputs for picker)
