import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fetchProducts, type Product, API_BASE_URL } from "@/lib/api";
import { ProductBrowser } from "@/components/ProductBrowser";
import { CartReconciler } from "@/components/CartReconciler";
import { LOW_STOCK_THRESHOLD } from "@/components/StockBadge";
import { faCircleExclamation } from "@/lib/icons";
import { formatBaht, formatNumber } from "@/lib/format";

export default async function HomePage() {
  let products: Product[];

  try {
    // Server Component ดึงข้อมูลจาก backend ตรง ๆ (Next 16 ไม่ cache fetch โดย default)
    products = await fetchProducts();
  } catch (error) {
    // ห้ามกลืน error เงียบ — ที่ผ่านมาหน้าเว็บโทษว่า "backend ไม่ได้รัน" ทั้งที่สาเหตุจริงคือ HTTPS redirect
    console.error("[HomePage] ดึงรายการสินค้าไม่สำเร็จ:", error);
    return <BackendUnreachable reason={toReason(error)} />;
  }

  return (
    <>
      <PageHeader products={products} />

      <CartReconciler products={products} />

      <ProductBrowser products={products} />
    </>
  );
}

/**
 * ตัวเลขทุกตัวคำนวณจากรายการที่ดึงมาจากฐานข้อมูล ไม่มีค่าใดถูก hardcode
 */
function PageHeader({ products }: { products: Product[] }) {
  const inventoryValue = products.reduce(
    (sum, p) => sum + p.unitPrice * p.stockQuantity,
    0,
  );
  const needsAttention = products.filter(
    (p) => p.stockQuantity <= LOW_STOCK_THRESHOLD,
  ).length;

  return (
    <header className="mb-10">
      <p className="text-sm font-medium text-accent">หน้าร้าน</p>

      <h1 className="mt-2 text-display font-semibold text-balance text-fg">
        รายการสินค้า
      </h1>

      <p className="mt-3 max-w-prose text-fg-muted">
        ราคาและยอดคงเหลือทุกช่องอ่านจากฐานข้อมูลจริงทุกครั้งที่เปิดหน้า
        เลือกจำนวนแล้วใส่ตะกร้าได้เลย ระบบจะกันไม่ให้สั่งเกินจำนวนที่มีอยู่
      </p>

      {/* มือถือต้องเป็นคอลัมน์เดียว — ยอดเงินหลักล้านกว้างเกินครึ่งจอ 375px แล้วล้นช่อง */}
      <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border-default bg-border-default sm:grid-cols-3">
        <Stat label="สินค้าทั้งหมด" value={`${formatNumber(products.length)} รายการ`} />
        <Stat label="มูลค่ารวมในคลัง" value={formatBaht(inventoryValue)} />
        <Stat
          label="ใกล้หมด / หมดแล้ว"
          value={`${formatNumber(needsAttention)} รายการ`}
          tone={needsAttention > 0 ? "warning" : "default"}
        />
      </dl>
    </header>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="bg-surface p-5">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd
        className={`mt-1 font-numeric text-xl font-semibold tabular-nums ${
          tone === "warning" ? "text-warning" : "text-fg"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function toReason(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function BackendUnreachable({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-border-default bg-surface p-8 shadow-sm">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <FontAwesomeIcon
            icon={faCircleExclamation}
            className="h-6 w-6"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-lg font-semibold text-fg">
          เชื่อมต่อ backend ไม่ได้
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          เรียก{" "}
          <code className="font-mono text-xs">{API_BASE_URL}/api/products</code>{" "}
          ไม่สำเร็จ
        </p>
      </div>

      <p className="mb-6 rounded-sm bg-danger-soft p-3 font-mono text-xs break-words text-danger">
        {reason}
      </p>

      <p className="mb-2 text-xs font-medium text-fg">ลองตรวจตามนี้</p>
      <ol className="list-inside list-decimal space-y-1 text-xs text-fg-muted">
        <li>backend รันอยู่จริงไหม</li>
        <li>
          ยิง <code className="font-mono">{API_BASE_URL}/api/products</code>{" "}
          แล้วได้ <code className="font-mono">307</code> ไหม — ถ้าใช่แปลว่า HTTPS
          redirect ยังเปิดอยู่
        </li>
        <li>
          <code className="font-mono">NEXT_PUBLIC_API_BASE_URL</code> ใน{" "}
          <code className="font-mono">.env.local</code> ชี้พอร์ตถูกไหม
        </li>
      </ol>

      <pre className="mt-4 overflow-x-auto rounded-sm bg-surface-2 p-3 font-mono text-xs text-fg-muted">
        dotnet run --project Thanachart_test\Thanachart_test.csproj
      </pre>
    </div>
  );
}
