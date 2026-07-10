"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "สินค้า" },
  { href: "/guide", label: "คู่มือใช้งาน" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="เมนูหลัก" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-surface-2 text-fg"
                : "text-fg-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
