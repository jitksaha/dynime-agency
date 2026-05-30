import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

/**
 * Lightweight checkout cart for service tiers + add-ons.
 *
 * This is intentionally NOT an e-commerce shopping cart UI. It's only the
 * state bridge between picking a service tier on a service page and landing
 * on the multi-step `/checkout` flow with the right line items + total.
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  slug: string;
  quantity?: number;
  /** Period label from the pricing tier, e.g. "/month", "one-time", "per project". Used to detect recurring orders. */
  period?: string;
  /** Service category key (dws/dms/dcs/dss) — used for per-category intake fields and recurring categorization. */
  category?: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: CartItem, opts?: { silent?: boolean }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "checkout_cart_v1";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const addItem = useCallback((item: CartItem, opts?: { silent?: boolean }) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: (p.quantity || 1) + (item.quantity || 1) } : p,
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
    if (!opts?.silent) toast.success(`${item.name} added`);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: qty } : p)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
    total: items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0),
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  }), [items, addItem, removeItem, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
