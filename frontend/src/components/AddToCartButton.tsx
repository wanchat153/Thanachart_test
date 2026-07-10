"use client";

import { useState, useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Product } from "@/lib/api";
import { faBan, faCartShopping, faMinus, faPlus } from "@/lib/icons";
import { clampAddQuantity, quantityOf, remainingAddable } from "@/lib/cart";
import {
  cartActions,
  getCartServerSnapshot,
  getCartSnapshot,
  subscribeCart,
} from "@/lib/cart-store";

const DISABLED_BUTTON_CLASS =
  "flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-sm border border-border-default bg-surface-2 px-4 py-2.5 text-sm font-medium text-fg-subtle";

/**
 * ปุ่ม ± ของ stepper — 44×44 ตามเกณฑ์ touch target
 * มุม 6px เพราะกล่องที่ครอบมุม 8px แล้วมี padding (กฎ nested radius)
 */
const STEPPER_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/**
 * เลือกจำนวนก่อน แล้วค่อยกด "ใส่ตะกร้า"
 *
 * stepper เป็น state ของหน้าจอเท่านั้น — ยังไม่แตะตะกร้าจนกว่าจะกดปุ่ม
 * (ต่างจากหน้า /cart ที่ stepper แก้ตะกร้าโดยตรง เพราะเจตนาต่างกัน)
 */
export function AddToCartButton({ product }: { product: Product }) {
  const cart = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );

  const [desired, setDesired] = useState(1);

  const inCart = quantityOf(cart, product.code);
  const remaining = remainingAddable(cart, product);

  // หนีบตอน render ไม่ใช่ใน useEffect — ตะกร้าอาจถูกแก้จากแท็บอื่นจนเพดานลดลง
  // (eslint rule react-hooks/set-state-in-effect ห้าม setState ใน effect เพื่ออ่าน external state)
  const quantity = clampAddQuantity(cart, product, desired);

  if (product.stockQuantity <= 0) {
    return (
      <button type="button" disabled className={DISABLED_BUTTON_CLASS}>
        <FontAwesomeIcon
          icon={faBan}
          className="h-3.5 w-3.5"
          aria-hidden="true"
        />
        สินค้าหมด
      </button>
    );
  }

  if (remaining <= 0) {
    return (
      <div className="space-y-1.5">
        <button type="button" disabled className={DISABLED_BUTTON_CLASS}>
          <FontAwesomeIcon
            icon={faBan}
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />
          ครบจำนวนที่มีในสต๊อกแล้ว
        </button>
        <InCartNote inCart={inCart} />
      </div>
    );
  }

  function handleAdd() {
    cartActions.add(product, quantity);
    setDesired(1); // เริ่มนับใหม่สำหรับการเพิ่มครั้งถัดไป
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-sm border border-border-default bg-surface p-1">
        <button
          type="button"
          onClick={() => setDesired(quantity - 1)}
          disabled={quantity <= 1}
          aria-label={`ลดจำนวนที่จะใส่ตะกร้า ${product.productName}`}
          className={STEPPER_BUTTON_CLASS}
        >
          <FontAwesomeIcon
            icon={faMinus}
            className="h-3 w-3"
            aria-hidden="true"
          />
        </button>

        <span
          aria-live="polite"
          aria-label={`จำนวนที่จะใส่ตะกร้า ${quantity} ชิ้น`}
          data-testid={`qty-${product.code}`}
          className="min-w-8 text-center font-numeric text-sm font-semibold text-fg tabular-nums"
        >
          {quantity}
        </span>

        <button
          type="button"
          onClick={() => setDesired(quantity + 1)}
          disabled={quantity >= remaining}
          aria-label={`เพิ่มจำนวนที่จะใส่ตะกร้า ${product.productName}`}
          title={
            quantity >= remaining ? `เลือกได้สูงสุด ${remaining} ชิ้น` : undefined
          }
          className={STEPPER_BUTTON_CLASS}
        >
          <FontAwesomeIcon
            icon={faPlus}
            className="h-3 w-3"
            aria-hidden="true"
          />
        </button>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        data-testid={`add-${product.code}`}
        className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-4 py-3 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover hover:shadow-accent active:scale-[0.98]"
      >
        <FontAwesomeIcon
          icon={faCartShopping}
          className="h-3.5 w-3.5"
          aria-hidden="true"
        />
        ใส่ตะกร้า
      </button>

      <InCartNote inCart={inCart} remaining={remaining} />
    </div>
  );
}

function InCartNote({
  inCart,
  remaining,
}: {
  inCart: number;
  remaining?: number;
}) {
  if (inCart === 0) {
    return (
      <p className="text-center text-xs text-fg-subtle">
        เลือกได้สูงสุด {remaining} ชิ้น
      </p>
    );
  }

  return (
    <p className="text-center text-xs text-fg-subtle">
      อยู่ในตะกร้าแล้ว <span className="font-medium text-fg">{inCart}</span> ชิ้น
      {remaining !== undefined && ` · เพิ่มได้อีก ${remaining} ชิ้น`}
    </p>
  );
}
