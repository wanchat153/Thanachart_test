import type { CSSProperties } from "react";

/**
 * ภาพหัวการ์ดสินค้า
 *
 * ฐานข้อมูลไม่มีคอลัมน์รูปภาพ และ stock photo โหล ๆ ทำให้เว็บดูถูกลง
 * จึงสร้างพื้นหลัง gradient จากรหัสสินค้าแทน — รหัสเดียวกันได้สีเดิมเสมอ (deterministic)
 *
 * hue ถูกล็อกไว้ในช่วง 205–325 ซึ่งเป็นสีข้างเคียงของ accent (272)
 * ถ้าปล่อยให้สุ่มทั้งวงล้อ หน้ารวมสินค้าจะกลายเป็นสายรุ้ง
 */
const HUE_START = 205;
const HUE_SPAN = 120;

/**
 * FNV-1a + avalanche (fmix32)
 *
 * hash แบบคูณ-บวกธรรมดาไม่พอ: รหัสสินค้าจริงเรียงกัน (P001, P002, …) hash จึงต่างกันทีละ 1
 * แล้ว hue ก็ต่างกันทีละ 1 องศา — การ์ดทุกใบออกมาสีเดียวกันหมด (เห็นมาแล้วกับตา)
 * ขั้นตอน avalanche กระจายบิตให้อินพุตที่ต่างกัน 1 บิตได้ผลลัพธ์ต่างกันคนละทาง
 */
function hueOf(code: string): number {
  let hash = 2166136261;
  for (const char of code) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash = (hash ^= hash >>> 16) >>> 0;

  return HUE_START + (hash % HUE_SPAN);
}

export function ProductThumb({
  code,
  isOutOfStock = false,
  dense = false,
}: {
  code: string;
  isOutOfStock?: boolean;
  /** ใช้ในแถวของหน้าตะกร้า — กล่องเล็กกว่าการ์ดมาก ตัวอักษรต้องเล็กตาม */
  dense?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ "--thumb-hue": hueOf(code) } as CSSProperties}
      className={`product-thumb flex items-center justify-center overflow-hidden ${
        dense ? "h-full w-full" : "aspect-[16/10]"
      } ${isOutOfStock ? "saturate-50" : ""}`}
    >
      <span
        className={`font-numeric font-bold tracking-widest text-white/25 select-none ${
          dense ? "text-[10px]" : "text-4xl"
        }`}
      >
        {code}
      </span>
    </div>
  );
}
