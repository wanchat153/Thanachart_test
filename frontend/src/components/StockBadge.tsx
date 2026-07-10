import { formatNumber } from "@/lib/format";

/** เกณฑ์ "เหลือน้อย" — ต่ำกว่าหรือเท่านี้ถือว่าใกล้หมด */
export const LOW_STOCK_THRESHOLD = 5;

const BASE_CLASS =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium";

/**
 * ป้ายบอกสต๊อก — สื่อความหมายด้วย "ข้อความ + จุดสี" ไม่ใช่สีอย่างเดียว
 * (คนตาบอดสีต้องอ่านออกเช่นกัน)
 */
export function StockBadge({ stockQuantity }: { stockQuantity: number }) {
  if (stockQuantity <= 0) {
    return (
      <span className={`${BASE_CLASS} bg-danger-soft text-danger`}>
        <Dot />
        สินค้าหมด
      </span>
    );
  }

  if (stockQuantity <= LOW_STOCK_THRESHOLD) {
    return (
      <span className={`${BASE_CLASS} bg-warning-soft text-warning`}>
        <Dot />
        เหลือ {formatNumber(stockQuantity)} ชิ้น
      </span>
    );
  }

  return (
    <span className={`${BASE_CLASS} bg-success-soft text-success`}>
      <Dot />
      คงเหลือ {formatNumber(stockQuantity)} ชิ้น
    </span>
  );
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
    />
  );
}
