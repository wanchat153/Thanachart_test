"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Product } from "@/lib/api";
import { faMagnifyingGlass, faXmark } from "@/lib/icons";
import { formatBaht } from "@/lib/format";
import { splitHighlight, suggestProducts, type SearchMatch } from "@/lib/search";
import { ProductThumb } from "@/components/ProductThumb";

/** จำนวนตัวเลือกสูงสุดใน dropdown — มากกว่านี้รายการยาวเกินจอมือถือ */
const MAX_SUGGESTIONS = 6;

/**
 * ช่องค้นหาสินค้าแบบ autocomplete
 *
 * ข้อมูลสินค้าถูกดึงจาก DB มาแล้วทั้งชุดที่ Server Component จึงค้นในหน่วยความจำได้ทันที
 * ไม่ต้อง debounce และไม่ยิง API ทุกตัวอักษร — พิมพ์ตัวเดียวก็เห็นผลลัพธ์
 *
 * ทำตาม ARIA combobox pattern: input มี role="combobox" ชี้ไปที่ listbox
 * และบอกตัวเลือกที่กำลังเลือกด้วย aria-activedescendant (ไม่ย้าย focus จริงออกจาก input)
 */
export function ProductSearch({
  products,
  query,
  onQueryChange,
  onSelect,
  onClear,
}: {
  products: readonly Product[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (product: Product) => void;
  onClear: () => void;
}) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = suggestProducts(products, query, MAX_SUGGESTIONS);
  const showList = isOpen && matches.length > 0;

  // คลิกนอกกล่องแล้วต้องปิด dropdown — effect นี้จัดการ event listener ของ document เท่านั้น
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  function handleChange(value: string) {
    onQueryChange(value);
    setIsOpen(value.trim().length > 0);
    setActiveIndex(-1); // คำค้นเปลี่ยน ตัวเลือกที่เคยเลือกไว้ไม่มีความหมายแล้ว
  }

  function choose(match: SearchMatch) {
    onSelect(match.product);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function clear() {
    onClear();
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault(); // กันเคอร์เซอร์กระโดดไปท้ายข้อความ
      if (!showList) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!showList) return;
      setActiveIndex((index) => (index <= 0 ? matches.length - 1 : index - 1));
      return;
    }

    if (event.key === "Enter") {
      if (showList && activeIndex >= 0) {
        event.preventDefault();
        choose(matches[activeIndex]);
      } else {
        setIsOpen(false); // ไม่ได้เลือกตัวไหน — ปล่อยให้ grid กรองตามคำค้นที่พิมพ์ไว้
      }
      return;
    }

    if (event.key === "Escape") {
      // ปิดรายการก่อน ถ้าปิดอยู่แล้วค่อยล้างคำค้น (ผู้ใช้คาดหวังลำดับนี้)
      if (isOpen) {
        setIsOpen(false);
        setActiveIndex(-1);
      } else if (query.length > 0) {
        clear();
      }
      return;
    }

    if (event.key === "Tab") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-fg-subtle"
      />

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim().length > 0 && setIsOpen(true)}
        placeholder="ค้นหาชื่อสินค้าหรือรหัส เช่น หูฟัง หรือ P005"
        aria-label="ค้นหาสินค้า"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        data-testid="product-search"
        className="h-12 w-full rounded-md border border-border-default bg-surface pr-12 pl-11 text-base text-fg shadow-sm transition-colors placeholder:text-fg-subtle hover:border-border-strong focus:border-accent"
      />

      {query.length > 0 && (
        <button
          type="button"
          onClick={clear}
          aria-label="ล้างคำค้นหา"
          data-testid="search-clear"
          className="absolute top-1/2 right-1.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <FontAwesomeIcon icon={faXmark} className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="ผลการค้นหาสินค้า"
          data-testid="search-listbox"
          className="absolute top-full right-0 left-0 z-[var(--z-overlay)] mt-2 overflow-hidden rounded-md border border-border-default bg-bg-elevated py-1 shadow-lg"
        >
          {matches.map((match, index) => (
            <Suggestion
              key={match.product.code}
              id={`${listboxId}-option-${index}`}
              match={match}
              isActive={index === activeIndex}
              onHover={() => setActiveIndex(index)}
              onChoose={() => choose(match)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Suggestion({
  id,
  match,
  isActive,
  onHover,
  onChoose,
}: {
  id: string;
  match: SearchMatch;
  isActive: boolean;
  onHover: () => void;
  onChoose: () => void;
}) {
  const { product, field, start, length } = match;
  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <li
      id={id}
      role="option"
      aria-selected={isActive}
      onMouseMove={onHover}
      // mousedown ทำให้ input เสีย focus ก่อน click จะทำงาน -> dropdown ปิดแล้วคลิกไม่โดน
      onMouseDown={(event) => event.preventDefault()}
      onClick={onChoose}
      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${
        isActive ? "bg-accent-soft" : ""
      }`}
    >
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xs">
        <ProductThumb code={product.code} isOutOfStock={isOutOfStock} dense />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-fg">
          {field === "name" ? (
            <Highlighted text={product.productName} start={start} length={length} />
          ) : (
            product.productName
          )}
        </p>
        <p className="font-numeric text-xs text-fg-subtle">
          {field === "code" ? (
            <Highlighted text={product.code} start={start} length={length} />
          ) : (
            product.code
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-numeric text-sm font-medium text-fg tabular-nums">
          {formatBaht(product.unitPrice)}
        </p>
        <p
          className={`text-xs ${isOutOfStock ? "text-danger" : "text-fg-subtle"}`}
        >
          {isOutOfStock ? "สินค้าหมด" : `เหลือ ${product.stockQuantity}`}
        </p>
      </div>
    </li>
  );
}

/** ทำตัวหนาเฉพาะช่วงที่ตรงกับคำค้น เพื่อให้ผู้ใช้เห็นว่าทำไมรายการนี้ถึงขึ้นมา */
function Highlighted({
  text,
  start,
  length,
}: {
  text: string;
  start: number;
  length: number;
}) {
  const { before, match, after } = splitHighlight(text, start, length);

  return (
    <>
      {before}
      <mark className="bg-transparent font-semibold text-accent">{match}</mark>
      {after}
    </>
  );
}
