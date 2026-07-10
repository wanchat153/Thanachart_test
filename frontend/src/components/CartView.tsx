"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  ApiError,
  checkout,
  type CheckoutOrder,
  type Product,
} from "@/lib/api";
import {
  faCartShopping,
  faCircleExclamation,
  faMinus,
  faPlus,
  faSpinner,
  faTrash,
  faTrashCan,
} from "@/lib/icons";
import { canAdd, cartTotal, totalItemCount } from "@/lib/cart";
import { formatBaht, formatNumber } from "@/lib/format";
import {
  cartActions,
  getCartServerSnapshot,
  getCartSnapshot,
  subscribeCart,
} from "@/lib/cart-store";
import { CheckoutSummary } from "@/components/CheckoutSummary";
import { ProductThumb } from "@/components/ProductThumb";

/** ปุ่ม ± ในแถวสินค้า — 44×44 ตามเกณฑ์ touch target · มุมเล็กกว่ากล่องที่ครอบอยู่ (กฎ nested radius) */
const STEPPER_BUTTON_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

export function CartView({ products }: { products: Product[] }) {
  const router = useRouter();
  const cart = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );

  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);

  /**
   * ตัวกันกดซ้ำต้องเป็น ref ไม่ใช่ state
   *
   * `isSubmitting` เป็น state ที่อัปเดตแบบ asynchronous — ถ้ากดปุ่มรัวหลายครั้งก่อน React
   * จะ re-render เสร็จ ทุกครั้งจะยังอ่านค่าเก่า (false) แล้วยิง POST /api/checkout ซ้ำ
   * ทำให้เกิดหลายบิล (ยืนยันแล้ว: กด 5 ครั้ง -> backend ได้รับ 5 request)
   *
   * ref เปลี่ยนค่าทันทีในบรรทัดเดียวกัน จึงกันได้จริง ส่วน state ยังต้องมีไว้สั่ง re-render ปุ่ม
   */
  const isSubmittingRef = useRef(false);

  // ชำระเงินเสร็จแล้ว -> แสดงสรุปบิล (ตะกร้าถูกล้างไปแล้ว จึงต้องเช็คก่อน EmptyCart)
  if (order) {
    return <CheckoutSummary order={order} />;
  }

  if (cart.length === 0) {
    return <EmptyCart />;
  }

  const productByCode = new Map(products.map((p) => [p.code, p]));
  const total = cartTotal(cart, products);
  const count = totalItemCount(cart);

  async function handleCheckout() {
    if (isSubmittingRef.current) return; // กันกดซ้ำ = หลายบิล
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await checkout(cart);
      cartActions.clear();
      setOrder(result);
      // สต๊อกเปลี่ยนแล้ว ให้ Server Component ดึงข้อมูลใหม่ (useState ของหน้านี้ไม่หาย)
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("ชำระเงินไม่สำเร็จ"));

      // ของหมดระหว่างทาง: ไม่ล้างตะกร้า แต่ดึงสต๊อกล่าสุดมาให้ผู้ใช้เห็นความจริง
      if (err instanceof ApiError && err.isStockConflict) {
        router.refresh();
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-accent">ขั้นตอนสุดท้าย</p>
          <h1 className="mt-2 text-display font-semibold text-fg">
            ตะกร้าสินค้า
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {formatNumber(count)} ชิ้น จาก {formatNumber(cart.length)} รายการ
          </p>
        </div>

        <button
          type="button"
          onClick={() => cartActions.clear()}
          disabled={isSubmitting}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-border-default px-4 text-sm font-medium text-fg-muted transition-colors hover:border-danger hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FontAwesomeIcon
            icon={faTrashCan}
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />
          ล้างตะกร้า
        </button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div>
          {error && <CheckoutError error={error} />}

          <ul className="space-y-3">
            {cart.map((item) => {
              const product = productByCode.get(item.code);
              if (!product) return null;

              return (
                <li
                  key={item.code}
                  className="flex flex-wrap items-center gap-4 rounded-lg border border-border-default bg-surface p-4"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm">
                    <ProductThumb code={product.code} dense />
                  </div>

                  <div className="min-w-40 flex-1">
                    <span className="font-numeric text-xs text-fg-subtle">
                      {product.code}
                    </span>
                    <h2 className="font-medium text-fg">{product.productName}</h2>
                    <p className="font-numeric text-sm text-fg-muted tabular-nums">
                      {formatBaht(product.unitPrice)} × {item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 rounded-sm border border-border-default p-1">
                    <button
                      type="button"
                      onClick={() => cartActions.decrease(item.code)}
                      disabled={isSubmitting}
                      aria-label={`ลดจำนวน ${product.productName}`}
                      className={STEPPER_BUTTON_CLASS}
                    >
                      <FontAwesomeIcon
                        icon={faMinus}
                        className="h-3 w-3"
                        aria-hidden="true"
                      />
                    </button>

                    <span className="min-w-8 text-center font-numeric text-sm font-semibold text-fg tabular-nums">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => cartActions.add(product)}
                      disabled={isSubmitting || !canAdd(cart, product)}
                      aria-label={`เพิ่มจำนวน ${product.productName}`}
                      title={
                        canAdd(cart, product)
                          ? undefined
                          : "ครบจำนวนที่มีในสต๊อกแล้ว"
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

                  <p className="min-w-28 text-right font-numeric text-base font-semibold text-fg tabular-nums">
                    {formatBaht(product.unitPrice * item.quantity)}
                  </p>

                  <button
                    type="button"
                    onClick={() => cartActions.remove(item.code)}
                    disabled={isSubmitting}
                    aria-label={`ลบ ${product.productName} ออกจากตะกร้า`}
                    className="flex h-11 w-11 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                  >
                    <FontAwesomeIcon
                      icon={faTrash}
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* บนจอใหญ่สรุปยอดเกาะไว้ให้เห็นตลอดขณะเลื่อนดูรายการ — มือถือไหลตามเนื้อหาปกติ */}
        <aside className="rounded-lg border border-border-default bg-surface p-6 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-fg">สรุปคำสั่งซื้อ</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">จำนวนสินค้า</dt>
              <dd className="font-numeric text-fg tabular-nums">
                {formatNumber(count)} ชิ้น
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-fg-muted">รายการ</dt>
              <dd className="font-numeric text-fg tabular-nums">
                {formatNumber(cart.length)} รายการ
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex items-end justify-between border-t border-border-default pt-5">
            <span className="text-sm text-fg-muted">ยอดรวมทั้งบิล</span>
            <span
              data-testid="cart-total"
              className="font-numeric text-2xl font-semibold text-fg tabular-nums"
            >
              {formatBaht(total)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isSubmitting}
            data-testid="checkout-button"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-accent px-5 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover hover:shadow-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          >
            {isSubmitting ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
                กำลังชำระเงิน…
              </>
            ) : (
              "ชำระเงิน"
            )}
          </button>

          <p className="mt-3 text-center text-xs text-fg-subtle">
            ระบบตัดสต๊อกและออกบิลในธุรกรรมเดียว
          </p>
        </aside>
      </div>
    </>
  );
}

function CheckoutError({ error }: { error: Error }) {
  const isStockConflict = error instanceof ApiError && error.isStockConflict;

  return (
    <div
      role="alert"
      data-testid="checkout-error"
      className="mb-6 flex gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4"
    >
      <FontAwesomeIcon
        icon={faCircleExclamation}
        className="mt-1 h-4 w-4 shrink-0 text-danger"
        aria-hidden="true"
      />
      <div className="text-sm">
        <p className="font-medium text-fg">
          {isStockConflict ? "สินค้าถูกซื้อตัดหน้า" : "ชำระเงินไม่สำเร็จ"}
        </p>
        <p className="mt-1 text-fg-muted">{error.message}</p>
        {isStockConflict && (
          <p className="mt-1 text-fg-muted">
            ยอดคงเหลือถูกอัปเดตแล้ว — ปรับจำนวนในตะกร้าแล้วลองใหม่อีกครั้ง
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
        <FontAwesomeIcon
          icon={faCartShopping}
          className="h-6 w-6"
          aria-hidden="true"
        />
      </div>
      <h1 className="text-2xl font-semibold text-fg">ตะกร้าว่างเปล่า</h1>
      <p className="mt-2 mb-8 text-sm text-fg-muted">
        ยังไม่ได้เลือกสินค้า ลองกลับไปเลือกดูก่อน
      </p>
      <Link
        href="/"
        className="inline-flex h-12 items-center rounded-sm bg-accent px-6 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover hover:shadow-accent"
      >
        เลือกสินค้า
      </Link>
    </div>
  );
}
