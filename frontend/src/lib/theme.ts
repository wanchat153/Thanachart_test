export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "shopping-theme";

/**
 * ธีมเป็น "external state" ที่อยู่นอก React (DOM dataset + localStorage + matchMedia)
 * จึงอ่านด้วย useSyncExternalStore แทนการ setState ใน useEffect
 * (ดู eslint rule react-hooks/set-state-in-effect)
 */
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  // แท็บอื่นเปลี่ยนธีม -> แท็บนี้ตามด้วย
  window.addEventListener("storage", onStoreChange);

  return () => {
    listeners.delete(onStoreChange);
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** ธีมที่ใช้อยู่จริงบน client: ผู้ใช้เลือกเอง > ค่าของระบบปฏิบัติการ */
export function getThemeSnapshot(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * ตอน server render ยังไม่รู้ธีมของผู้ใช้ (ไม่มี DOM/localStorage)
 * คืน null เพื่อให้ UI ไม่วาดไอคอนผิดฝั่งแล้วกระพริบตอน hydrate
 */
export function getThemeServerSnapshot(): Theme | null {
  return null;
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์เขียน localStorage ไม่ได้ — ธีมยังใช้ได้ในหน้านี้ แค่ไม่ถูกจำ
  }
  notify();
}
