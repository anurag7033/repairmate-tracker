import { useEffect, useSyncExternalStore } from "react";

export interface CartItem {
  productId: string;
  name: string;
  productCode: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  price: number; // finalPrice
  mrp: number; // sellingPrice (for strikethrough)
  quantity: number;
  maxStock: number;
}

const STORAGE_KEY = "am_cart_v1";
const listeners = new Set<() => void>();

let cart: CartItem[] = load();

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return cart;
}

export function useCart() {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  // sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        cart = load();
        listeners.forEach((l) => l());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  return value;
}

export function addToCart(item: Omit<CartItem, "quantity">, qty = 1) {
  const existing = cart.find((c) => c.productId === item.productId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, item.maxStock || existing.quantity + qty);
  } else {
    cart = [...cart, { ...item, quantity: Math.min(qty, item.maxStock || qty) }];
  }
  persist();
}

export function updateQuantity(productId: string, qty: number) {
  cart = cart
    .map((c) =>
      c.productId === productId
        ? { ...c, quantity: Math.max(1, Math.min(qty, c.maxStock || qty)) }
        : c
    )
    .filter((c) => c.quantity > 0);
  persist();
}

export function removeFromCart(productId: string) {
  cart = cart.filter((c) => c.productId !== productId);
  persist();
}

export function clearCart() {
  cart = [];
  persist();
}

export function isInCart(productId: string) {
  return cart.some((c) => c.productId === productId);
}

export function cartCount() {
  return cart.reduce((sum, c) => sum + c.quantity, 0);
}

export function cartSubtotal() {
  return cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
}
