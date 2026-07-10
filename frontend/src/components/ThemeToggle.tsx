"use client";

import { useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@/lib/icons";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
} from "@/lib/theme";

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border-default bg-surface text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      {/* theme === null ระหว่าง server render — เว้นที่ไว้ขนาดเท่ากัน layout จึงไม่เด้ง */}
      {theme === null ? null : (
        <FontAwesomeIcon
          icon={isDark ? faSun : faMoon}
          className="h-4 w-4"
          fixedWidth
        />
      )}
    </button>
  );
}
