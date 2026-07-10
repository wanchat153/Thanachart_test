"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Product } from "@/lib/api";
import { faMagnifyingGlass } from "@/lib/icons";
import { formatNumber } from "@/lib/format";
import { filterProducts } from "@/lib/search";
import { ProductCard } from "@/components/ProductCard";
import { ProductSearch } from "@/components/ProductSearch";
import { Reveal } from "@/components/Reveal";

/**
 * ช่องค้นหา + ตารางสินค้าที่กรองแล้ว
 *
 * รายการสินค้าทั้งหมดมาจาก Server Component (ซึ่งอ่านจาก DB) แล้วส่งลงมาเป็น prop
 * คอมโพเนนต์นี้ไม่รู้จัก API เลย ทำหน้าที่เดียวคือกรองสิ่งที่ได้รับมา
 */
export function ProductBrowser({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  /** รหัสสินค้าที่ผู้ใช้เลือกจาก dropdown — กรองเหลือตัวเดียว */
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const visible = filterProducts(products, query, selectedCode);
  const isSearching = query.trim().length > 0 || selectedCode !== null;

  function handleSelect(product: Product) {
    setSelectedCode(product.code);
    setQuery(product.productName);
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    setSelectedCode(null); // พิมพ์ต่อ = ไม่ได้ล็อกสินค้าตัวเดิมแล้ว
  }

  function handleClear() {
    setQuery("");
    setSelectedCode(null);
  }

  return (
    <section aria-label="ค้นหาและเลือกสินค้า">
      <div className="mb-6 sm:max-w-xl">
        <ProductSearch
          products={products}
          query={query}
          onQueryChange={handleQueryChange}
          onSelect={handleSelect}
          onClear={handleClear}
        />
      </div>

      {/* ผู้ใช้ screen reader ต้องรู้ว่าผลลัพธ์เปลี่ยนไปกี่รายการ โดยไม่ต้องไล่อ่าน grid */}
      <p
        aria-live="polite"
        data-testid="search-result-count"
        className={`mb-6 text-sm text-fg-muted ${isSearching ? "" : "sr-only"}`}
      >
        {isSearching
          ? `พบ ${formatNumber(visible.length)} รายการ`
          : `แสดงสินค้าทั้งหมด ${formatNumber(products.length)} รายการ`}
      </p>

      {visible.length === 0 ? (
        <NoResults query={query} onClear={handleClear} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product, index) =>
            // ระหว่างค้นหาไม่ต้อง reveal — การ์ดจะ fade ใหม่ทุกตัวอักษรที่พิมพ์ = กระพริบ
            isSearching ? (
              <div key={product.code} className="flex">
                <ProductCard product={product} />
              </div>
            ) : (
              <Reveal
                key={product.code}
                delayMs={(index % 3) * 60}
                className="flex"
              >
                <ProductCard product={product} />
              </Reveal>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div
      data-testid="search-empty"
      className="mx-auto max-w-md rounded-lg border border-border-default bg-surface py-16 text-center"
    >
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-fg-subtle">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="h-5 w-5"
          aria-hidden="true"
        />
      </div>

      <h2 className="text-lg font-semibold text-fg">ไม่พบสินค้าที่ค้นหา</h2>
      <p className="mt-2 mb-6 px-6 text-sm text-fg-muted">
        ไม่มีสินค้าที่ชื่อหรือรหัสตรงกับ{" "}
        <span className="font-medium text-fg">“{query}”</span>
      </p>

      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-11 items-center rounded-sm border border-border-default px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
      >
        ล้างคำค้นหา
      </button>
    </div>
  );
}
