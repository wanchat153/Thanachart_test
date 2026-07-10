import type { Product } from "@/lib/api";

/**
 * ตะกร้าเก็บเฉพาะ code + quantity เท่านั้น
 *
 * จงใจ *ไม่* เก็บราคาลง localStorage เพราะราคาอาจเปลี่ยนหลังผู้ใช้ทิ้งตะกร้าไว้
 * ราคาที่แสดงต้องอ่านจากรายการสินค้าที่เพิ่งดึงจาก DB เสมอ
 * และตอน checkout ฝั่ง backend จะอ่านราคาจาก DB อีกรอบ ไม่เชื่อค่าจาก client
 */
export interface CartItem {
  code: string;
  quantity: number;
}

export type Cart = readonly CartItem[];

export const EMPTY_CART: Cart = [];

export function findItem(cart: Cart, code: string): CartItem | undefined {
  return cart.find((item) => item.code === code);
}

export function quantityOf(cart: Cart, code: string): number {
  return findItem(cart, code)?.quantity ?? 0;
}

export function totalItemCount(cart: Cart): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

/** จำนวนสูงสุดที่ยังเพิ่มได้ ก่อนชนยอดคงเหลือในสต๊อก */
export function remainingAddable(cart: Cart, product: Product): number {
  return Math.max(0, product.stockQuantity - quantityOf(cart, product.code));
}

export function canAdd(cart: Cart, product: Product): boolean {
  return remainingAddable(cart, product) > 0;
}

/**
 * หนีบจำนวนที่ผู้ใช้เลือกบนการ์ดสินค้า ให้อยู่ในช่วง 1..(สต๊อกที่ยังเพิ่มได้)
 *
 * ใช้ตอน render ไม่ใช่ใน useEffect — ถ้าตะกร้าถูกแก้จากแท็บอื่นจนเพดานลดลง
 * ค่าที่ค้างอยู่ใน state ต้องถูกหนีบทันทีที่วาดใหม่ ไม่ใช่รอ effect ทำงาน
 *
 * คืน 0 เมื่อเพิ่มไม่ได้แล้ว (ของหมด หรือในตะกร้าครบสต๊อกแล้ว)
 */
export function clampAddQuantity(
  cart: Cart,
  product: Product,
  desired: number,
): number {
  const max = remainingAddable(cart, product);
  if (max <= 0) return 0;

  if (!Number.isFinite(desired) || !Number.isInteger(desired) || desired < 1) {
    return 1;
  }

  return Math.min(desired, max);
}

/**
 * เพิ่มสินค้าลงตะกร้า — ถ้าจะทำให้เกินสต๊อก จะตัดให้เหลือเท่าที่มีจริง
 * (ไม่ throw เพื่อให้ UI เรียกได้ง่าย; ปุ่มควร disabled อยู่แล้วเมื่อ canAdd() เป็น false)
 */
export function addItem(cart: Cart, product: Product, quantity = 1): Cart {
  if (quantity <= 0) return cart;

  const addable = Math.min(quantity, remainingAddable(cart, product));
  if (addable === 0) return cart;

  const existing = findItem(cart, product.code);
  if (!existing) {
    return [...cart, { code: product.code, quantity: addable }];
  }

  return cart.map((item) =>
    item.code === product.code
      ? { ...item, quantity: item.quantity + addable }
      : item,
  );
}

/** ลดจำนวนลง 1 — ถ้าเหลือ 0 ให้ลบรายการออกจากตะกร้าไปเลย */
export function decreaseItem(cart: Cart, code: string): Cart {
  const existing = findItem(cart, code);
  if (!existing) return cart;

  if (existing.quantity <= 1) {
    return removeItem(cart, code);
  }

  return cart.map((item) =>
    item.code === code ? { ...item, quantity: item.quantity - 1 } : item,
  );
}

export function removeItem(cart: Cart, code: string): Cart {
  if (!findItem(cart, code)) return cart;
  return cart.filter((item) => item.code !== code);
}

export function clearCart(): Cart {
  return EMPTY_CART;
}

/** สาเหตุที่รายการในตะกร้าถูกปรับ — คนละเรื่องกัน จึงต้องบอกผู้ใช้ให้ตรง */
export type AdjustmentReason =
  /** สต๊อกลดลง แต่ยังพอซื้อได้บางส่วน */
  | "reduced"
  /** สต๊อกเหลือ 0 */
  | "out-of-stock"
  /** ไม่มีสินค้ารหัสนี้ในระบบแล้ว */
  | "not-found";

export interface CartAdjustment {
  code: string;
  from: number;
  to: number;
  reason: AdjustmentReason;
}

export interface ReconcileResult {
  cart: Cart;
  /** รายการที่ถูกตัดยอดลงหรือถูกลบทิ้ง */
  adjusted: CartAdjustment[];
}

/**
 * ปรับตะกร้าที่โหลดมาจาก localStorage ให้สอดคล้องกับสต๊อกล่าสุดจาก DB
 *
 * จำเป็นเพราะตะกร้าอยู่ใน localStorage ของเบราว์เซอร์ ข้ามวันได้
 * ระหว่างนั้นสินค้าอาจถูกคนอื่นซื้อไป สต๊อกลดลง หรือสินค้าถูกลบออกจากระบบ
 */
export function reconcileWithStock(
  cart: Cart,
  products: readonly Product[],
): ReconcileResult {
  const stockByCode = new Map(products.map((p) => [p.code, p.stockQuantity]));
  const adjusted: ReconcileResult["adjusted"] = [];
  const next: CartItem[] = [];

  for (const item of cart) {
    // สินค้าไม่มีในระบบแล้ว -> เอาออกจากตะกร้า
    const stock = stockByCode.get(item.code);
    if (stock === undefined) {
      adjusted.push({
        code: item.code,
        from: item.quantity,
        to: 0,
        reason: "not-found",
      });
      continue;
    }

    const allowed = Math.min(item.quantity, stock);
    if (allowed !== item.quantity) {
      adjusted.push({
        code: item.code,
        from: item.quantity,
        to: allowed,
        reason: allowed === 0 ? "out-of-stock" : "reduced",
      });
    }
    if (allowed > 0) {
      next.push({ code: item.code, quantity: allowed });
    }
  }

  return { cart: next, adjusted };
}

/** รวมยอดเงินจากราคาปัจจุบันใน DB (ไม่ใช่ราคาที่เก็บไว้ใน localStorage) */
export function cartTotal(cart: Cart, products: readonly Product[]): number {
  const priceByCode = new Map(products.map((p) => [p.code, p.unitPrice]));
  return cart.reduce(
    (sum, item) => sum + (priceByCode.get(item.code) ?? 0) * item.quantity,
    0,
  );
}

/** ตรวจว่าค่าที่อ่านจาก localStorage มีรูปร่างถูกต้องจริง (ผู้ใช้แก้เองได้) */
export function parseCart(raw: string | null): Cart {
  if (!raw) return EMPTY_CART;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_CART;

    const items: CartItem[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null) continue;
      const { code, quantity } = entry as Record<string, unknown>;
      if (typeof code !== "string" || code.length === 0) continue;
      if (typeof quantity !== "number" || !Number.isInteger(quantity)) continue;
      if (quantity <= 0) continue;
      items.push({ code, quantity });
    }
    return items;
  } catch {
    return EMPTY_CART;
  }
}
