import { supabase } from "@/integrations/supabase/client";
import {
  SalesInvoice,
  SalesInvoiceItem,
  SalesPayment,
  SalesPaymentMethod,
  SalesPaymentStatus,
} from "@/types/salesInvoice";

const mapInvoice = (row: any, items: any[] = [], payments: any[] = []): SalesInvoice => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  customerId: row.customer_id,
  customerName: row.customer_name || "",
  customerPhone: row.customer_phone || "",
  customerAltPhone: row.customer_alt_phone || "",
  customerEmail: row.customer_email || "",
  customerAddress: row.customer_address || "",
  customerGst: row.customer_gst || "",
  subtotal: Number(row.subtotal) || 0,
  productDiscountTotal: Number(row.product_discount_total) || 0,
  invoiceDiscount: Number(row.invoice_discount) || 0,
  gstPercent: Number(row.gst_percent) || 0,
  gstAmount: Number(row.gst_amount) || 0,
  grandTotal: Number(row.grand_total) || 0,
  amountReceived: Number(row.amount_received) || 0,
  changeReturned: Number(row.change_returned) || 0,
  remainingAmount: Number(row.remaining_amount) || 0,
  totalPurchaseCost: Number(row.total_purchase_cost) || 0,
  totalProfit: Number(row.total_profit) || 0,
  paymentMethod: row.payment_method as SalesPaymentMethod,
  paymentStatus: row.payment_status as SalesPaymentStatus,
  notes: row.notes || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  items: items.map(mapItem),
  payments: payments.map(mapPayment),
});

const mapPayment = (row: any): SalesPayment => ({
  id: row.id,
  invoiceId: row.invoice_id,
  amount: Number(row.amount) || 0,
  previousBalance: Number(row.previous_balance) || 0,
  newBalance: Number(row.new_balance) || 0,
  paymentMethod: row.payment_method || null,
  updatedBy: row.updated_by || null,
  note: row.note || null,
  createdAt: row.created_at,
});

const mapItem = (row: any): SalesInvoiceItem => ({
  id: row.id,
  invoiceId: row.invoice_id,
  productId: row.product_id,
  productCode: row.product_code,
  productName: row.product_name,
  quantity: Number(row.quantity) || 0,
  unitPrice: Number(row.unit_price) || 0,
  discount: Number(row.discount) || 0,
  lineTotal: Number(row.line_total) || 0,
  purchasePrice: Number(row.purchase_price) || 0,
  profitPerUnit: Number(row.profit_per_unit) || 0,
  totalProfit: Number(row.total_profit) || 0,
});

export async function getSalesInvoices(): Promise<SalesInvoice[]> {
  const { data, error } = await supabase
    .from("sales_invoices" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map((r) => mapInvoice(r));
}

export async function getSalesInvoiceById(id: string): Promise<SalesInvoice | null> {
  const { data: inv, error } = await supabase
    .from("sales_invoices" as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!inv) return null;
  const [{ data: items, error: ie }, { data: payments, error: pe }] = await Promise.all([
    supabase.from("sales_invoice_items" as any).select("*").eq("invoice_id", id).order("created_at", { ascending: true }),
    supabase.from("sales_invoice_payments" as any).select("*").eq("invoice_id", id).order("created_at", { ascending: true }),
  ]);
  if (ie) throw ie;
  if (pe) throw pe;
  return mapInvoice(inv as any, (items as any[]) || [], (payments as any[]) || []);
}

export async function getInvoicesByCustomerId(customerId: string): Promise<SalesInvoice[]> {
  const { data, error } = await supabase
    .from("sales_invoices" as any)
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map((r) => mapInvoice(r));
}

export interface SalesInvoiceInput {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAltPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGst?: string;
  invoiceDiscount: number;
  gstPercent: number;
  amountReceived: number;
  paymentMethod: SalesPaymentMethod;
  notes?: string;
  items: Array<{
    productId: string | null;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    purchasePrice: number;
  }>;
}

export function computeTotals(input: Pick<SalesInvoiceInput, "items" | "invoiceDiscount" | "gstPercent" | "amountReceived">) {
  let subtotal = 0;
  let productDiscountTotal = 0;
  let totalPurchaseCost = 0;
  let totalProfit = 0;
  const lines = input.items.map((it) => {
    const gross = it.quantity * it.unitPrice;
    const lineTotal = Math.max(0, gross - it.discount);
    const profitPerUnit = it.unitPrice - it.purchasePrice;
    const lineProfit = (it.unitPrice - it.purchasePrice) * it.quantity - it.discount;
    subtotal += gross;
    productDiscountTotal += it.discount;
    totalPurchaseCost += it.purchasePrice * it.quantity;
    totalProfit += lineProfit;
    return { ...it, lineTotal, profitPerUnit, totalProfit: lineProfit };
  });
  const afterDiscounts = Math.max(0, subtotal - productDiscountTotal - (input.invoiceDiscount || 0));
  const gstAmount = +(afterDiscounts * (input.gstPercent || 0) / 100).toFixed(2);
  const grandTotal = +(afterDiscounts + gstAmount).toFixed(2);
  const received = input.amountReceived || 0;
  const diff = received - grandTotal;
  const changeReturned = diff > 0 ? diff : 0;
  const remainingAmount = diff < 0 ? -diff : 0;
  let paymentStatus: SalesPaymentStatus = "pending";
  if (received >= grandTotal && grandTotal > 0) paymentStatus = "paid";
  else if (received > 0) paymentStatus = "partial";
  return {
    lines,
    subtotal: +subtotal.toFixed(2),
    productDiscountTotal: +productDiscountTotal.toFixed(2),
    gstAmount,
    grandTotal,
    changeReturned: +changeReturned.toFixed(2),
    remainingAmount: +remainingAmount.toFixed(2),
    totalPurchaseCost: +totalPurchaseCost.toFixed(2),
    totalProfit: +totalProfit.toFixed(2),
    paymentStatus,
  };
}

export async function createSalesInvoice(input: SalesInvoiceInput): Promise<SalesInvoice> {
  if (!input.items.length) throw new Error("Add at least one product to the invoice.");
  const totals = computeTotals(input);
  const { data: inv, error } = await supabase
    .from("sales_invoices" as any)
    .insert({
      customer_id: input.customerId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_alt_phone: input.customerAltPhone || null,
      customer_email: input.customerEmail || null,
      customer_address: input.customerAddress || null,
      customer_gst: input.customerGst || null,
      subtotal: totals.subtotal,
      product_discount_total: totals.productDiscountTotal,
      invoice_discount: input.invoiceDiscount || 0,
      gst_percent: input.gstPercent || 0,
      gst_amount: totals.gstAmount,
      grand_total: totals.grandTotal,
      amount_received: input.amountReceived || 0,
      change_returned: totals.changeReturned,
      remaining_amount: totals.remainingAmount,
      total_purchase_cost: totals.totalPurchaseCost,
      total_profit: totals.totalProfit,
      payment_method: input.paymentMethod,
      payment_status: totals.paymentStatus,
      notes: input.notes || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  const invoiceId = (inv as any).id;
  const itemsRows = totals.lines.map((l) => ({
    invoice_id: invoiceId,
    product_id: l.productId,
    product_code: l.productCode,
    product_name: l.productName,
    quantity: l.quantity,
    unit_price: l.unitPrice,
    discount: l.discount,
    line_total: l.lineTotal,
    purchase_price: l.purchasePrice,
    profit_per_unit: l.profitPerUnit,
    total_profit: l.totalProfit,
  }));
  const { data: items, error: ie } = await supabase
    .from("sales_invoice_items" as any)
    .insert(itemsRows)
    .select("*");
  if (ie) throw ie;
  return mapInvoice(inv as any, (items as any[]) || []);
}

export async function deleteSalesInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("sales_invoices" as any).delete().eq("id", id);
  if (error) throw error;
}

export interface AddPaymentInput {
  invoiceId: string;
  amount: number;
  paymentMethod?: string;
  updatedBy?: string;
  note?: string;
}

export async function addInvoicePayment(input: AddPaymentInput): Promise<SalesInvoice> {
  const current = await getSalesInvoiceById(input.invoiceId);
  if (!current) throw new Error("Invoice not found");
  if (input.amount <= 0) throw new Error("Amount must be greater than 0");

  const previousBalance = current.remainingAmount;
  const newReceived = +(current.amountReceived + input.amount).toFixed(2);
  const grandTotal = current.grandTotal;
  const diff = newReceived - grandTotal;
  const changeReturned = diff > 0 ? +diff.toFixed(2) : 0;
  const remainingAmount = diff < 0 ? +(-diff).toFixed(2) : 0;
  let paymentStatus: SalesPaymentStatus = "pending";
  if (newReceived >= grandTotal && grandTotal > 0) paymentStatus = "paid";
  else if (newReceived > 0) paymentStatus = "partial";

  const { error: upErr } = await supabase
    .from("sales_invoices" as any)
    .update({
      amount_received: newReceived,
      change_returned: changeReturned,
      remaining_amount: remainingAmount,
      payment_status: paymentStatus,
    })
    .eq("id", input.invoiceId);
  if (upErr) throw upErr;

  const { error: insErr } = await supabase
    .from("sales_invoice_payments" as any)
    .insert({
      invoice_id: input.invoiceId,
      amount: input.amount,
      previous_balance: previousBalance,
      new_balance: remainingAmount,
      payment_method: input.paymentMethod || null,
      updated_by: input.updatedBy || null,
      note: input.note || null,
    });
  if (insErr) throw insErr;

  const updated = await getSalesInvoiceById(input.invoiceId);
  if (!updated) throw new Error("Invoice not found after update");
  return updated;
}

export async function updateInvoicePaymentStatus(invoiceId: string, status: SalesPaymentStatus): Promise<void> {
  const { error } = await supabase
    .from("sales_invoices" as any)
    .update({ payment_status: status })
    .eq("id", invoiceId);
  if (error) throw error;
}
