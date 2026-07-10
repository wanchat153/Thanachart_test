import type { Product } from "@/lib/api";

/**
 * ค้นหาสินค้าฝั่ง client
 *
 * หน้าแรกดึงสินค้าทั้งหมดจาก DB มาแล้ว (ไม่กี่สิบรายการ) การกรองจึงทำในหน่วยความจำได้
 * ไม่ต้องยิง API ทุกตัวอักษร — และข้อมูลยังมาจาก DB เหมือนเดิม ไม่มีการ hardcode
 *
 * โมดูลนี้เป็นฟังก์ชันบริสุทธิ์ล้วน ไม่แตะ DOM/state จึงเทสต์ตรง ๆ ได้
 */

/**
 * อันดับความ "ตรง" — เลขน้อย = ตรงกว่า = แสดงก่อน
 * ใช้ const object ไม่ใช่ `const enum` เพราะ Next เปิด isolatedModules
 */
export const MatchRank = {
  /** ชื่อสินค้าขึ้นต้นด้วยคำค้น */
  NameStart: 0,
  /** คำค้นอยู่ต้นคำใดคำหนึ่งของชื่อ (เช่น "sony" ใน "หูฟัง Sony WH-1000XM5") */
  NameWordStart: 1,
  /** คำค้นอยู่กลางชื่อ */
  NameContains: 2,
  /** รหัสสินค้าขึ้นต้นด้วยคำค้น */
  CodeStart: 3,
  /** คำค้นอยู่กลางรหัส */
  CodeContains: 4,
} as const;

export type MatchRank = (typeof MatchRank)[keyof typeof MatchRank];

/** ฟิลด์ที่ทำให้สินค้าตัวนี้ถูกพบ — ใช้ตัดสินว่าจะไฮไลต์ตรงไหนใน dropdown */
export type MatchField = "name" | "code";

export interface SearchMatch {
  product: Product;
  rank: MatchRank;
  field: MatchField;
  /** ตำแหน่งเริ่มต้นของช่วงที่ตรง (index ใน string ต้นฉบับ ไม่ใช่ string ที่ normalize) */
  start: number;
  length: number;
}

/**
 * ตัดช่องว่างหัวท้ายและทำให้ตัวพิมพ์เล็ก-ใหญ่ไม่มีผล
 *
 * `toLowerCase()` ไม่เปลี่ยนความยาวของอักษรไทย/ละตินที่ใช้ในโปรเจคนี้
 * ตำแหน่ง index ที่ได้จาก string ที่ normalize แล้วจึงตรงกับ string ต้นฉบับ
 */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** ต้นคำ = อยู่หลังช่องว่างหรือวงเล็บเปิด (ชื่อสินค้าจริงมีทั้งสองแบบ) */
function isWordStart(text: string, index: number): boolean {
  if (index === 0) return true;
  return /[\s(]/.test(text[index - 1]);
}

/**
 * หาว่าสินค้าตัวนี้ตรงกับคำค้นไหม ถ้าตรง ตรงที่ไหนและ "ตรงแค่ไหน"
 * รับคำค้นดิบจากผู้ใช้ได้เลย — normalize ให้เอง
 */
export function matchProduct(
  product: Product,
  query: string,
): SearchMatch | null {
  return matchNormalized(product, normalizeQuery(query));
}

/** ตัวที่ทำงานจริง — รับคำค้นที่ normalize แล้ว เพื่อไม่ต้อง normalize ซ้ำทุกสินค้าใน loop */
function matchNormalized(
  product: Product,
  normalizedQuery: string,
): SearchMatch | null {
  if (normalizedQuery.length === 0) return null;

  const name = product.productName.toLowerCase();
  const nameIndex = name.indexOf(normalizedQuery);

  if (nameIndex === 0) {
    return match(product, MatchRank.NameStart, "name", 0, normalizedQuery.length);
  }

  if (nameIndex > 0) {
    const rank = isWordStart(name, nameIndex)
      ? MatchRank.NameWordStart
      : MatchRank.NameContains;
    return match(product, rank, "name", nameIndex, normalizedQuery.length);
  }

  const code = product.code.toLowerCase();
  const codeIndex = code.indexOf(normalizedQuery);

  if (codeIndex === 0) {
    return match(product, MatchRank.CodeStart, "code", 0, normalizedQuery.length);
  }

  if (codeIndex > 0) {
    return match(
      product,
      MatchRank.CodeContains,
      "code",
      codeIndex,
      normalizedQuery.length,
    );
  }

  return null;
}

function match(
  product: Product,
  rank: MatchRank,
  field: MatchField,
  start: number,
  length: number,
): SearchMatch {
  return { product, rank, field, start, length };
}

/**
 * รายการที่ตรงกับคำค้น เรียงจากตรงที่สุด
 *
 * อันดับเท่ากันให้เรียงตามรหัสสินค้า เพื่อให้ผลลัพธ์คงที่ (deterministic)
 * ไม่ขึ้นกับลำดับที่ backend ส่งมา
 */
export function searchProducts(
  products: readonly Product[],
  query: string,
): SearchMatch[] {
  const normalized = normalizeQuery(query);
  if (normalized.length === 0) return [];

  return products
    .map((product) => matchNormalized(product, normalized))
    .filter((m): m is SearchMatch => m !== null)
    .sort((a, b) => a.rank - b.rank || a.product.code.localeCompare(b.product.code));
}

/**
 * สินค้าที่จะแสดงใน grid
 *
 * คำค้นว่าง = แสดงทุกอย่าง (ไม่ใช่ไม่แสดงอะไรเลย)
 * ถ้ามีสินค้าที่ถูก "เลือก" จาก dropdown แล้ว จะเหลือแค่ตัวนั้นตัวเดียว
 */
export function filterProducts(
  products: readonly Product[],
  query: string,
  selectedCode?: string | null,
): Product[] {
  if (selectedCode) {
    return products.filter((p) => p.code === selectedCode);
  }

  const normalized = normalizeQuery(query);
  if (normalized.length === 0) return [...products];

  return searchProducts(products, query).map((m) => m.product);
}

/** ตัวเลือกใน dropdown — จำกัดจำนวนเพื่อไม่ให้รายการยาวเกินจอ */
export function suggestProducts(
  products: readonly Product[],
  query: string,
  limit = 8,
): SearchMatch[] {
  return searchProducts(products, query).slice(0, limit);
}

export interface HighlightParts {
  before: string;
  match: string;
  after: string;
}

/** ตัดข้อความเป็น 3 ส่วนเพื่อทำตัวหนาเฉพาะช่วงที่ตรงกับคำค้น */
export function splitHighlight(
  text: string,
  start: number,
  length: number,
): HighlightParts {
  if (start < 0 || length <= 0 || start >= text.length) {
    return { before: text, match: "", after: "" };
  }

  return {
    before: text.slice(0, start),
    match: text.slice(start, start + length),
    after: text.slice(start + length),
  };
}
