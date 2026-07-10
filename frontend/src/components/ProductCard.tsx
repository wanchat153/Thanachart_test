import type { Product } from "@/lib/api";
import { formatBaht } from "@/lib/format";
import { StockBadge } from "@/components/StockBadge";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductThumb } from "@/components/ProductThumb";

export function ProductCard({ product }: { product: Product }) {
  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-lg border border-border-default bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
      <div className="relative">
        <ProductThumb code={product.code} isOutOfStock={isOutOfStock} />

        <div className="absolute top-3 right-3">
          <StockBadge stockQuantity={product.stockQuantity} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="font-numeric text-xs tracking-wide text-fg-subtle">
          {product.code}
        </p>

        <h2 className="mt-1 text-base font-semibold text-balance text-fg">
          {product.productName}
        </h2>

        <div className="mt-auto pt-5">
          <p className="font-numeric text-2xl font-semibold text-fg tabular-nums">
            {formatBaht(product.unitPrice)}
          </p>
          <p className="mt-0.5 mb-4 text-xs text-fg-subtle">ราคาต่อหน่วย</p>

          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
