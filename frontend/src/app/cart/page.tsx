import { fetchProducts, type Product } from "@/lib/api";
import { CartView } from "@/components/CartView";
import { CartReconciler } from "@/components/CartReconciler";

export default async function CartPage() {
  let products: Product[] = [];

  try {
    // ต้องมีรายการสินค้าล่าสุดจาก DB เพื่อรู้ราคาปัจจุบันและสต๊อกคงเหลือ
    // (ตะกร้าใน localStorage เก็บแค่ code + quantity)
    products = await fetchProducts();
  } catch (error) {
    console.error("[CartPage] ดึงรายการสินค้าไม่สำเร็จ:", error);
    return (
      <div
        role="alert"
        className="mx-auto max-w-lg rounded-lg border border-danger/30 bg-danger-soft p-6"
      >
        <p className="mb-2 text-sm font-medium text-fg">
          เชื่อมต่อ backend ไม่ได้ — เปิดตะกร้าไม่ได้ในตอนนี้
        </p>
        <p className="font-mono text-xs break-words text-danger">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  }

  return (
    <>
      <CartReconciler products={products} />
      <CartView products={products} />
    </>
  );
}
