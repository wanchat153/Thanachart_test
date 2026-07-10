"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@/lib/icons";
import { totalItemCount } from "@/lib/cart";
import {
  getCartServerSnapshot,
  getCartSnapshot,
  subscribeCart,
} from "@/lib/cart-store";

export function CartLink() {
  const cart = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );

  const count = totalItemCount(cart);

  return (
    <Link
      href="/cart"
      aria-label={`ตะกร้าสินค้า มี ${count} ชิ้น`}
      className="relative inline-flex h-11 items-center gap-2 rounded-sm border border-border-default bg-surface px-3.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <FontAwesomeIcon
        icon={faCartShopping}
        className="h-3.5 w-3.5"
        aria-hidden="true"
      />
      <span className="hidden sm:inline">ตะกร้า</span>

      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg tabular-nums">
          {count}
        </span>
      )}
    </Link>
  );
}
