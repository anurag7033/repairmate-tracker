import { RepairOrder } from "@/types/repair";

const STORAGE_KEY = "repair_orders";
const ADMIN_PASSWORD = "admin123"; // Simple password for demo

export function getOrders(): RepairOrder[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveOrders(orders: RepairOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function addOrder(order: RepairOrder): void {
  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
}

export function updateOrder(updated: RepairOrder): void {
  const orders = getOrders().map((o) => (o.id === updated.id ? updated : o));
  saveOrders(orders);
}

export function deleteOrder(id: string): void {
  saveOrders(getOrders().filter((o) => o.id !== id));
}

export function findByTrackingId(trackingId: string): RepairOrder | undefined {
  return getOrders().find(
    (o) => o.trackingId.toLowerCase() === trackingId.toLowerCase()
  );
}

export function generateTrackingId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "MR-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function verifyAdmin(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function getWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
