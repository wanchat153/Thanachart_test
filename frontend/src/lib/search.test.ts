import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/api";
import {
  MatchRank,
  filterProducts,
  matchProduct,
  normalizeQuery,
  searchProducts,
  splitHighlight,
  suggestProducts,
} from "@/lib/search";

/** ใช้ชื่อจริงจาก seed data เพื่อให้เทสต์สะท้อนข้อมูลที่ผู้ใช้เจอจริง */
const product = (
  code: string,
  productName: string,
  unitPrice = 100,
  stockQuantity = 10,
): Product => ({ code, productName, unitPrice, stockQuantity });

const laptop = product("P001", "โน้ตบุ๊ก ThinkPad X1 Carbon", 45900, 12);
const mouse = product("P002", "เมาส์ไร้สาย Logitech MX Master 3S", 3290.5, 40);
const keyboard = product("P003", "คีย์บอร์ด Keychron K2 (Hot-swap)", 3890, 25);
const monitor = product("P004", 'จอมอนิเตอร์ Dell 27" 4K', 15900, 8);
const headphone = product("P005", "หูฟัง Sony WH-1000XM5", 12990.75, 15);
const webcam = product("P006", "เว็บแคม Logitech C920", 2490, 30);

const catalog = [laptop, mouse, keyboard, monitor, headphone, webcam];

describe("normalizeQuery", () => {
  it("ตัดช่องว่างหัวท้ายและทำเป็นตัวพิมพ์เล็ก", () => {
    expect(normalizeQuery("  SoNy  ")).toBe("sony");
  });

  it("คำค้นที่มีแต่ช่องว่างถือว่าว่าง", () => {
    expect(normalizeQuery("   ")).toBe("");
  });
});

describe("matchProduct", () => {
  it("คำค้นว่างไม่ตรงกับอะไรเลย", () => {
    expect(matchProduct(laptop, "")).toBeNull();
  });

  it("พิมพ์พยัญชนะไทยตัวเดียวก็ตรงที่ต้นชื่อ", () => {
    expect(matchProduct(headphone, "ห")).toMatchObject({
      rank: MatchRank.NameStart,
      field: "name",
      start: 0,
      length: 1,
    });
  });

  it("ชื่อขึ้นต้นด้วยคำค้น = อันดับดีที่สุด", () => {
    // "หู" ยาว 2 หน่วย (พยัญชนะ + สระอู) — length นับตาม string ต้นฉบับ
    expect(matchProduct(headphone, "หู")).toMatchObject({
      rank: MatchRank.NameStart,
      field: "name",
      start: 0,
      length: 2,
    });
  });

  it("ตรงที่ต้นคำกลางชื่อ ดีกว่าตรงกลางคำ", () => {
    // "Sony" อยู่หลังช่องว่างใน "หูฟัง Sony WH-1000XM5"
    expect(matchProduct(headphone, "sony")?.rank).toBe(MatchRank.NameWordStart);
    // "ony" อยู่กลางคำ
    expect(matchProduct(headphone, "ony")?.rank).toBe(MatchRank.NameContains);
  });

  it("ต้นคำนับหลังวงเล็บเปิดด้วย", () => {
    expect(matchProduct(keyboard, "hot")?.rank).toBe(MatchRank.NameWordStart);
  });

  it("ตัวพิมพ์เล็ก-ใหญ่ไม่มีผล และคืนตำแหน่งตาม string ต้นฉบับ", () => {
    const found = matchProduct(laptop, "THINKPAD");
    expect(found?.field).toBe("name");
    expect(laptop.productName.slice(found!.start, found!.start + found!.length)).toBe(
      "ThinkPad",
    );
  });

  it("ค้นด้วยรหัสสินค้าได้ แต่อันดับต่ำกว่าการตรงที่ชื่อ", () => {
    expect(matchProduct(laptop, "p001")?.rank).toBe(MatchRank.CodeStart);
    expect(matchProduct(laptop, "001")?.rank).toBe(MatchRank.CodeContains);
  });

  it("ไม่ตรงเลยคืน null", () => {
    expect(matchProduct(laptop, "ตู้เย็น")).toBeNull();
  });
});

describe("searchProducts", () => {
  it("พิมพ์ตัวอักษรเดียวก็ค้นเจอ", () => {
    const found = searchProducts(catalog, "ห");
    expect(found.map((m) => m.product.code)).toContain("P005");
  });

  it("ชื่อมาก่อนรหัสเสมอ", () => {
    // "p0" ตรงกับรหัสของทุกตัว แต่ไม่มีตัวไหนมี "p0" ในชื่อ
    const byCode = searchProducts(catalog, "p0");
    expect(byCode).toHaveLength(catalog.length);
    expect(byCode.every((m) => m.field === "code")).toBe(true);

    // "logitech" ตรงที่ชื่อของ 2 ตัว
    const byName = searchProducts(catalog, "logitech");
    expect(byName.map((m) => m.product.code)).toEqual(["P002", "P006"]);
    expect(byName.every((m) => m.field === "name")).toBe(true);
  });

  it("เรียงตามอันดับ แล้วจึงเรียงตามรหัสเมื่ออันดับเท่ากัน", () => {
    const found = searchProducts(
      [webcam, mouse, headphone],
      "logitech",
    );
    // ทั้งคู่เป็น NameWordStart -> เรียงตามรหัส P002 ก่อน P006
    expect(found.map((m) => m.product.code)).toEqual(["P002", "P006"]);
  });

  it("คำค้นว่างคืนลิสต์ว่าง (ไม่ใช่ทุกรายการ)", () => {
    expect(searchProducts(catalog, "  ")).toEqual([]);
  });
});

describe("filterProducts", () => {
  it("คำค้นว่าง = แสดงสินค้าทั้งหมด", () => {
    expect(filterProducts(catalog, "")).toHaveLength(catalog.length);
  });

  it("กรองตามคำค้น", () => {
    expect(filterProducts(catalog, "logitech").map((p) => p.code)).toEqual([
      "P002",
      "P006",
    ]);
  });

  it("เลือกสินค้าจาก dropdown แล้วเหลือตัวเดียว ไม่ว่าคำค้นจะเป็นอะไร", () => {
    expect(filterProducts(catalog, "logitech", "P006")).toEqual([webcam]);
    expect(filterProducts(catalog, "", "P001")).toEqual([laptop]);
  });

  it("ไม่พบอะไรเลยคืนลิสต์ว่าง", () => {
    expect(filterProducts(catalog, "ตู้เย็น")).toEqual([]);
  });

  it("ไม่แก้ไขอาร์เรย์ต้นฉบับ", () => {
    const copy = [...catalog];
    filterProducts(catalog, "sony");
    expect(catalog).toEqual(copy);
  });
});

describe("suggestProducts", () => {
  it("จำกัดจำนวนตัวเลือกตาม limit", () => {
    expect(suggestProducts(catalog, "p0", 3)).toHaveLength(3);
  });

  it("ค่าเริ่มต้นไม่เกิน 8 รายการ", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      product(`P${String(i).padStart(3, "0")}`, `สินค้า ${i}`),
    );
    expect(suggestProducts(many, "สินค้า")).toHaveLength(8);
  });
});

describe("splitHighlight", () => {
  it("ตัดข้อความเป็นสามส่วนตามช่วงที่ตรง", () => {
    expect(splitHighlight("หูฟัง Sony WH-1000XM5", 6, 4)).toEqual({
      before: "หูฟัง ",
      match: "Sony",
      after: " WH-1000XM5",
    });
  });

  it("ช่วงเริ่มที่ 0 ไม่มีส่วนหน้า", () => {
    expect(splitHighlight("Sony", 0, 4)).toEqual({
      before: "",
      match: "Sony",
      after: "",
    });
  });

  it("ช่วงไม่ถูกต้องคืนข้อความเดิมโดยไม่ไฮไลต์", () => {
    expect(splitHighlight("Sony", -1, 2).match).toBe("");
    expect(splitHighlight("Sony", 0, 0).match).toBe("");
    expect(splitHighlight("Sony", 10, 2).before).toBe("Sony");
  });
});
