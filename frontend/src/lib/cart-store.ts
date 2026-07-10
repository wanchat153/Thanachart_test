"use client";

import type { Product } from "@/lib/api";
import {
  EMPTY_CART,
  addItem,
  clearCart,
  decreaseItem,
  parseCart,
  removeItem,
  reconcileWithStock,
  type Cart,
  type CartAdjustment,
} from "@/lib/cart";

export const CART_STORAGE_KEY = "shopping-cart";

/** ต้องเป็นค่าคงที่ตัวเดิม ไม่งั้น useSyncExternalStore จะ re-render ไม่จบ */
const NO_ADJUSTMENTS: readonly CartAdjustment[] = [];

/**
 * ตะกร้าอยู่ใน localStorage = external state (นอก React) จึงใช้ useSyncExternalStore อ่าน
 * เหตุผลเดียวกับ theme.ts — และทำให้หลายแท็บเห็นตะกร้าตรงกัน
 */
let cart: Cart = EMPTY_CART;
let adjustments: readonly CartAdjustment[] = NO_ADJUSTMENTS;
let initialized = false;

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function persist(next: Cart) {
  cart = next;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // เขียน localStorage ไม่ได้ (โหมดส่วนตัว/พื้นที่เต็ม) — ตะกร้ายังใช้ได้ในหน้านี้ แค่ไม่ถูกจำ
  }
  notify();
}

function readFromStorage(): Cart {
  try {
    return parseCart(localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return EMPTY_CART;
  }
}

export function subscribeCart(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  // แท็บอื่นแก้ตะกร้า -> แท็บนี้ตามด้วย
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
    cart = readFromStorage();
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getCartSnapshot(): Cart {
  if (!initialized) {
    cart = readFromStorage();
    initialized = true;
  }
  return cart;
}

/** server render ยังไม่มี localStorage — คืนตะกร้าว่างเสมอ (อ้างอิงตัวเดิม กัน re-render ไม่จบ) */
export function getCartServerSnapshot(): Cart {
  return EMPTY_CART;
}

export function getAdjustmentsSnapshot(): readonly CartAdjustment[] {
  return adjustments;
}

export function getAdjustmentsServerSnapshot(): readonly CartAdjustment[] {
  return NO_ADJUSTMENTS;
}

export const cartActions = {
  add(product: Product, quantity = 1) {
    persist(addItem(getCartSnapshot(), product, quantity));
  },
  decrease(code: string) {
    persist(decreaseItem(getCartSnapshot(), code));
  },
  remove(code: string) {
    persist(removeItem(getCartSnapshot(), code));
  },
  clear() {
    persist(clearCart());
  },
  /**
   * เรียกหลังโหลดสินค้าล่าสุดจาก DB เพื่อตัดยอดที่เกินสต๊อกทิ้ง
   * ผลการปรับถูกเก็บไว้ใน store (อ่านผ่าน getAdjustmentsSnapshot) ไม่ใช่คืนค่าให้ React ไปเก็บเอง
   */
  reconcile(products: readonly Product[]) {
    const result = reconcileWithStock(getCartSnapshot(), products);

    if (result.adjusted.length > 0) {
      adjustments = result.adjusted;
      persist(result.cart); // persist เรียก notify ให้แล้ว
      return;
    }

    if (adjustments !== NO_ADJUSTMENTS) {
      adjustments = NO_ADJUSTMENTS;
      notify();
    }
  },

  dismissAdjustments() {
    if (adjustments === NO_ADJUSTMENTS) return;
    adjustments = NO_ADJUSTMENTS;
    notify();
  },
};
