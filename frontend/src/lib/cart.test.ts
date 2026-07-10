import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/api";
import {
  EMPTY_CART,
  addItem,
  canAdd,
  cartTotal,
  clampAddQuantity,
  clearCart,
  decreaseItem,
  parseCart,
  quantityOf,
  reconcileWithStock,
  remainingAddable,
  removeItem,
  totalItemCount,
  type Cart,
} from "@/lib/cart";

const laptop: Product = {
  code: "P001",
  productName: "โน้ตบุ๊ก",
  unitPrice: 45900,
  stockQuantity: 12,
};

/** ของหมด — ต้องกดเพิ่มไม่ได้เลย (ตรงกับ P009 ใน seed data) */
const soldOut: Product = {
  code: "P009",
  productName: "การ์ดจอ",
  unitPrice: 89900,
  stockQuantity: 0,
};

/** เหลือน้อย — กดได้ 3 ครั้งแล้วต้องตัน (ตรงกับ P010 ใน seed data) */
const lowStock: Product = {
  code: "P010",
  productName: "ด็อกกิ้ง",
  unitPrice: 8990,
  stockQuantity: 3,
};

const cable: Product = {
  code: "P011",
  productName: "สาย USB-C",
  unitPrice: 199.99,
  stockQuantity: 200,
};

describe("addItem", () => {
  it("เพิ่มสินค้าใหม่ลงตะกร้าว่าง", () => {
    const cart = addItem(EMPTY_CART, laptop);
    expect(cart).toEqual([{ code: "P001", quantity: 1 }]);
  });

  it("กดซ้ำแล้วเพิ่มจำนวน ไม่สร้างรายการซ้ำ", () => {
    let cart = addItem(EMPTY_CART, laptop);
    cart = addItem(cart, laptop);
    cart = addItem(cart, laptop);
    expect(cart).toHaveLength(1);
    expect(quantityOf(cart, "P001")).toBe(3);
  });

  it("ไม่แก้ไขตะกร้าเดิม (immutable)", () => {
    const before = addItem(EMPTY_CART, laptop);
    const after = addItem(before, laptop);
    expect(before).toEqual([{ code: "P001", quantity: 1 }]);
    expect(after).not.toBe(before);
  });

  it("สินค้าหมด (stock 0) เพิ่มไม่ได้เลย", () => {
    expect(canAdd(EMPTY_CART, soldOut)).toBe(false);
    expect(addItem(EMPTY_CART, soldOut)).toEqual(EMPTY_CART);
  });

  it("เพิ่มได้จนถึงจำนวนคงเหลือ แล้วตัน", () => {
    let cart: Cart = EMPTY_CART;
    for (let i = 0; i < 3; i++) cart = addItem(cart, lowStock);

    expect(quantityOf(cart, "P010")).toBe(3);
    expect(canAdd(cart, lowStock)).toBe(false);
    expect(remainingAddable(cart, lowStock)).toBe(0);

    // กดครั้งที่ 4 ต้องไม่มีผล
    const after = addItem(cart, lowStock);
    expect(quantityOf(after, "P010")).toBe(3);
  });

  it("เพิ่มทีละหลายชิ้นเกินสต๊อก จะถูกตัดให้เหลือเท่าที่มี", () => {
    const cart = addItem(EMPTY_CART, lowStock, 10);
    expect(quantityOf(cart, "P010")).toBe(3);
  });

  it("จำนวนเป็น 0 หรือติดลบ ไม่มีผล", () => {
    expect(addItem(EMPTY_CART, laptop, 0)).toEqual(EMPTY_CART);
    expect(addItem(EMPTY_CART, laptop, -5)).toEqual(EMPTY_CART);
  });
});

describe("clampAddQuantity — ตัวเลือกจำนวนบนการ์ดสินค้า", () => {
  it("จำนวนปกติที่ไม่เกินสต๊อก ผ่านไปตามเดิม", () => {
    expect(clampAddQuantity(EMPTY_CART, laptop, 5)).toBe(5);
  });

  it("เกินสต๊อก ถูกหนีบลงเหลือเท่าที่มี", () => {
    expect(clampAddQuantity(EMPTY_CART, lowStock, 99)).toBe(3);
  });

  it("หักของที่อยู่ในตะกร้าแล้วออกจากเพดาน", () => {
    const cart = addItem(EMPTY_CART, lowStock, 2); // เหลือเพิ่มได้อีก 1
    expect(clampAddQuantity(cart, lowStock, 5)).toBe(1);
  });

  it("ของหมด คืน 0 (เพิ่มไม่ได้เลย)", () => {
    expect(clampAddQuantity(EMPTY_CART, soldOut, 1)).toBe(0);
  });

  it("ในตะกร้าครบสต๊อกแล้ว คืน 0", () => {
    const cart = addItem(EMPTY_CART, lowStock, 3);
    expect(clampAddQuantity(cart, lowStock, 1)).toBe(0);
  });

  it("ค่าที่ต่ำกว่า 1 ถูกดันขึ้นเป็น 1", () => {
    expect(clampAddQuantity(EMPTY_CART, laptop, 0)).toBe(1);
    expect(clampAddQuantity(EMPTY_CART, laptop, -3)).toBe(1);
  });

  it("ค่าที่ไม่ใช่จำนวนเต็ม/ไม่ใช่ตัวเลข ถูกดันขึ้นเป็น 1", () => {
    expect(clampAddQuantity(EMPTY_CART, laptop, 2.5)).toBe(1);
    expect(clampAddQuantity(EMPTY_CART, laptop, NaN)).toBe(1);
    expect(clampAddQuantity(EMPTY_CART, laptop, Infinity)).toBe(1);
  });

  it("ของหมดชนะทุกกรณี แม้ desired จะผิดรูป", () => {
    expect(clampAddQuantity(EMPTY_CART, soldOut, -5)).toBe(0);
    expect(clampAddQuantity(EMPTY_CART, soldOut, NaN)).toBe(0);
  });
});

describe("decreaseItem", () => {
  it("ลดจำนวนลงทีละ 1", () => {
    const cart = addItem(addItem(EMPTY_CART, laptop), laptop);
    expect(quantityOf(decreaseItem(cart, "P001"), "P001")).toBe(1);
  });

  it("ลดจนเหลือ 0 แล้วรายการหายไปจากตะกร้า", () => {
    const cart = addItem(EMPTY_CART, laptop);
    expect(decreaseItem(cart, "P001")).toEqual(EMPTY_CART);
  });

  it("ลดสินค้าที่ไม่มีในตะกร้า ไม่พัง", () => {
    expect(decreaseItem(EMPTY_CART, "ไม่มีจริง")).toEqual(EMPTY_CART);
  });
});

describe("removeItem / clearCart", () => {
  it("ลบรายการที่ระบุ เหลือรายการอื่นไว้", () => {
    let cart = addItem(EMPTY_CART, laptop);
    cart = addItem(cart, cable);
    const after = removeItem(cart, "P001");
    expect(after).toEqual([{ code: "P011", quantity: 1 }]);
  });

  it("ล้างตะกร้าทั้งหมด", () => {
    let cart = addItem(EMPTY_CART, laptop);
    cart = addItem(cart, cable);
    expect(totalItemCount(cart)).toBe(2);

    expect(clearCart()).toEqual(EMPTY_CART);
    expect(totalItemCount(clearCart())).toBe(0);
  });
});

describe("totalItemCount / cartTotal", () => {
  it("นับจำนวนชิ้นรวมทุกรายการ", () => {
    let cart = addItem(EMPTY_CART, laptop, 2);
    cart = addItem(cart, cable, 3);
    expect(totalItemCount(cart)).toBe(5);
  });

  it("รวมเงินจากราคาปัจจุบันใน DB ไม่ใช่ราคาที่เก็บไว้", () => {
    const cart = addItem(EMPTY_CART, cable, 3);
    // 199.99 x 3 = 599.97 — ต้องไม่เพี้ยนเป็น 599.9700000000001
    expect(cartTotal(cart, [cable])).toBeCloseTo(599.97, 2);
  });

  it("สินค้าที่หาราคาไม่เจอ นับเป็น 0 ไม่ทำให้ยอดเป็น NaN", () => {
    const cart: Cart = [{ code: "ไม่มีจริง", quantity: 2 }];
    expect(cartTotal(cart, [laptop])).toBe(0);
  });
});

describe("reconcileWithStock", () => {
  it("สต๊อกยังพอ ตะกร้าไม่เปลี่ยน", () => {
    const cart = addItem(EMPTY_CART, laptop, 2);
    const result = reconcileWithStock(cart, [laptop]);
    expect(result.cart).toEqual([{ code: "P001", quantity: 2 }]);
    expect(result.adjusted).toEqual([]);
  });

  it("สต๊อกลดลงหลังทิ้งตะกร้าไว้ -> ตัดยอดลงเท่าที่มี พร้อมรายงาน reason=reduced", () => {
    const cart: Cart = [{ code: "P010", quantity: 3 }];
    const nowOnlyOneLeft: Product = { ...lowStock, stockQuantity: 1 };

    const result = reconcileWithStock(cart, [nowOnlyOneLeft]);
    expect(result.cart).toEqual([{ code: "P010", quantity: 1 }]);
    expect(result.adjusted).toEqual([
      { code: "P010", from: 3, to: 1, reason: "reduced" },
    ]);
  });

  it("สินค้าหมดเกลี้ยง -> เอาออกจากตะกร้า reason=out-of-stock", () => {
    const cart: Cart = [{ code: "P009", quantity: 2 }];
    const result = reconcileWithStock(cart, [soldOut]);
    expect(result.cart).toEqual([]);
    expect(result.adjusted).toEqual([
      { code: "P009", from: 2, to: 0, reason: "out-of-stock" },
    ]);
  });

  it("สินค้าถูกลบออกจากระบบ -> reason=not-found (คนละเรื่องกับของหมด)", () => {
    const cart: Cart = [{ code: "ถูกลบไปแล้ว", quantity: 1 }];
    const result = reconcileWithStock(cart, [laptop]);
    expect(result.cart).toEqual([]);
    expect(result.adjusted).toEqual([
      { code: "ถูกลบไปแล้ว", from: 1, to: 0, reason: "not-found" },
    ]);
  });

  it("แยก out-of-stock กับ not-found ออกจากกันได้ในบิลเดียว", () => {
    const cart: Cart = [
      { code: "P009", quantity: 1 },
      { code: "ไม่มีจริง", quantity: 1 },
    ];
    const result = reconcileWithStock(cart, [soldOut]);
    expect(result.adjusted.map((a) => a.reason)).toEqual([
      "out-of-stock",
      "not-found",
    ]);
  });
});

describe("parseCart — ข้อมูลจาก localStorage เชื่อไม่ได้", () => {
  it("อ่านค่าปกติได้", () => {
    const raw = JSON.stringify([{ code: "P001", quantity: 2 }]);
    expect(parseCart(raw)).toEqual([{ code: "P001", quantity: 2 }]);
  });

  it("null / สตริงว่าง -> ตะกร้าว่าง", () => {
    expect(parseCart(null)).toEqual(EMPTY_CART);
    expect(parseCart("")).toEqual(EMPTY_CART);
  });

  it("JSON พัง -> ตะกร้าว่าง ไม่ throw", () => {
    expect(parseCart("{ไม่ใช่ json")).toEqual(EMPTY_CART);
  });

  it("ไม่ใช่ array -> ตะกร้าว่าง", () => {
    expect(parseCart('{"code":"P001"}')).toEqual(EMPTY_CART);
  });

  it("กรองรายการที่รูปร่างผิดทิ้ง เก็บเฉพาะที่ถูกต้อง", () => {
    const raw = JSON.stringify([
      { code: "P001", quantity: 2 },
      { code: "P002", quantity: -1 },
      { code: "P003", quantity: 1.5 },
      { code: "", quantity: 1 },
      { code: "P004" },
      { quantity: 3 },
      null,
      "ขยะ",
      { code: "P005", quantity: 1 },
    ]);
    expect(parseCart(raw)).toEqual([
      { code: "P001", quantity: 2 },
      { code: "P005", quantity: 1 },
    ]);
  });
});
