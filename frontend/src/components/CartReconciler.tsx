"use client";

import { useEffect, useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Product } from "@/lib/api";
import type { CartAdjustment } from "@/lib/cart";
import { faCircleExclamation } from "@/lib/icons";
import {
  cartActions,
  getAdjustmentsServerSnapshot,
  getAdjustmentsSnapshot,
  subscribeCart,
} from "@/lib/cart-store";

function describeAdjustment(change: CartAdjustment): string {
  switch (change.reason) {
    case "not-found":
      return `ไม่มีสินค้ารหัสนี้ในระบบแล้ว — นำออกจากตะกร้า (เดิม ${change.from} ชิ้น)`;
    case "out-of-stock":
      return `สินค้าหมด — นำออกจากตะกร้า (เดิม ${change.from} ชิ้น)`;
    case "reduced":
      return `สต๊อกเหลือไม่พอ — ปรับจาก ${change.from} เหลือ ${change.to} ชิ้น`;
  }
}

/**
 * ตะกร้าอยู่ใน localStorage จึงข้ามวันได้ ระหว่างนั้นสต๊อกอาจลดลง
 * คอมโพเนนต์นี้เทียบตะกร้ากับสต๊อกล่าสุดจาก DB แล้วตัดยอดที่เกินทิ้ง พร้อมแจ้งผู้ใช้
 */
export function CartReconciler({ products }: { products: Product[] }) {
  // effect ทำหน้าที่เดียว: อัปเดต external system (ตะกร้าใน localStorage) ไม่ setState
  useEffect(() => {
    cartActions.reconcile(products);
  }, [products]);

  // ส่วนการ "อ่าน" ผลลัพธ์ อ่านจาก store โดยตรง
  const adjusted = useSyncExternalStore(
    subscribeCart,
    getAdjustmentsSnapshot,
    getAdjustmentsServerSnapshot,
  );

  if (adjusted.length === 0) return null;

  return (
    <div
      role="status"
      className="mb-6 flex gap-3 rounded-lg border border-warning/30 bg-warning-soft p-4"
    >
      <FontAwesomeIcon
        icon={faCircleExclamation}
        className="mt-1 h-4 w-4 shrink-0 text-warning"
        aria-hidden="true"
      />
      <div className="text-sm">
        <p className="mb-1 font-medium text-fg">
          ปรับจำนวนในตะกร้าให้ตรงกับสต๊อกล่าสุดแล้ว
        </p>
        <ul className="space-y-0.5 text-fg-muted">
          {adjusted.map((change) => (
            <li key={change.code}>
              <span className="font-numeric text-xs">{change.code}</span>:{" "}
              {describeAdjustment(change)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
