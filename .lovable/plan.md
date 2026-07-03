# Customer Orders System

Full end-to-end flow from cart checkout to admin approval and customer order tracking.

## 1. Database (new tables via migration)

**`customer_orders`**
- `id uuid pk`, `order_id text unique` (e.g. `ORD-2026-0001` from a new sequence)
- `customer_name`, `customer_phone`, `customer_email` (nullable), `delivery_address text`
- `payment_method text` — `'cod' | 'online'`
- `payment_status text` — `'pending' | 'paid' | 'failed'` (COD stays `pending` until delivery)
- `order_status text` — `'placed' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'`
- `subtotal`, `discount_amount`, `grand_total` numeric
- `voucher_id uuid null`, `voucher_code text null`
- `admin_notes text null`, `created_at`, `updated_at`

**`customer_order_items`**
- `id`, `order_id uuid fk`, `product_id uuid fk`, `product_code`, `product_name`
- `unit_price`, `quantity`, `line_total`

Both tables:
- GRANT SELECT/INSERT to `anon` on `customer_orders` + items (public checkout)
- GRANT SELECT/INSERT/UPDATE/DELETE to `authenticated` (admin)
- RLS: anon can INSERT orders + items and SELECT their own by `order_id` (public tracking); authenticated can do everything.

Sequence + trigger to auto-generate `order_id`. Reuse existing `apply_voucher_public`-style logic — add new RPC `apply_voucher_to_order(voucher_code, subtotal, phone)` returning `{ voucher_id, discount_amount }` without mutating vouchers yet; increment `used_count` on order creation.

## 2. Shop checkout (`src/pages/Shop.tsx`)

Replace WhatsApp checkout modal with a proper multi-step order form:
1. Name, phone, email (optional), address (required)
2. Payment method radio: **Cash on Delivery** / **Pay Online**
3. Voucher code input — only visible when `Pay Online` selected; validates against RPC, shows discount preview
4. Order summary (items, subtotal, discount, total)
5. **Place Order** button → inserts `customer_orders` + items, redirects to success page

Online payment: initially mark `payment_status = 'pending'` and route to a placeholder "Pay Now" screen (Razorpay integration already exists — reuse `create-payment-link` edge function pattern in a follow-up if needed). For this iteration, online orders are created with `payment_status = 'pending'` and can be marked paid manually by admin or via existing Razorpay flow.

## 3. Success page (`src/pages/OrderSuccess.tsx`)

- Route: `/order-success/:orderId`
- Shows big Order ID, summary, "Track Order" button → `/track-order/:orderId`

## 4. Order tracking (`src/pages/TrackOrder.tsx`)

- Route: `/track-order` (input form) and `/track-order/:orderId`
- Public lookup by `order_id` — vertical timeline of status transitions (matches existing repair-tracking style)

## 5. Admin Orders section (`src/components/admin/OrdersSection.tsx`)

Replace placeholder with:
- Tabs: All / Pending / Accepted / Out for Delivery / Delivered / Cancelled
- Table: Order ID, Customer, Items count, Total, Payment (COD/Online + paid badge), Status, Actions
- Row click → drawer with full details (items, address, voucher used)
- Action buttons: **Accept**, **Mark Preparing**, **Out for Delivery**, **Delivered**, **Cancel**
- Toggle payment status for COD (mark paid on delivery), for online (mark paid)

## 6. Store layer (`src/lib/customerOrderStore.ts`)

CRUD helpers: `createCustomerOrder`, `getCustomerOrders` (admin), `getCustomerOrderById` (public), `updateOrderStatus`, `updateOrderPayment`, `applyVoucherToOrder`.

## 7. Routing (`src/App.tsx`)

Add `/order-success/:orderId`, `/track-order`, `/track-order/:orderId`.

## Technical Notes

- Voucher discount is **only** allowed when `payment_method = 'online'` (validated both client-side and in RPC).
- Stock decrement on order creation via trigger on `customer_order_items` (same pattern as `decrement_product_stock`).
- Realtime not required in v1 — admin refreshes / customer polls tracking page.
- Not touching existing Razorpay wiring in this pass; online orders are placed with `payment_status = 'pending'` and admin (or future Razorpay hook) flips to `paid`.

## Out of scope (ask if needed later)
- Automatic Razorpay payment link generation for online orders
- Email/SMS notifications on status change
- Customer login / order history list
