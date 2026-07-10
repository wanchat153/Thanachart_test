import type { Metadata } from "next";
import Link from "next/link";
import { Anuphan, Inter } from "next/font/google";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CartLink } from "@/components/CartLink";
import { NavLinks } from "@/components/NavLinks";
import { Aurora } from "@/components/Aurora";
import { Footer } from "@/components/Footer";
import { faBagShopping } from "@/lib/icons";
import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Anuphan = ฟอนต์ไทยตัวหลัก (loopless อ่านบนจอง่าย) — ต้องมี subset "thai"
 * ไม่งั้นตัวไทยจะตกไปใช้ฟอนต์ระบบแล้วดูปนกันทันที
 *
 * Inter ใช้เฉพาะตัวเลข/ละติน (ราคา, รหัสสินค้า) เพราะเลขของมันกว้างเท่ากันทุกตัว
 * คู่กับ tabular-nums แล้วคอลัมน์ราคาจะไม่ขยับ
 */
const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  variable: "--font-anuphan",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shopping — ระบบสต๊อกสินค้าและตะกร้าสินค้า",
  description: "หน้าร้านสำหรับเลือกสินค้า ใส่ตะกร้า และชำระเงิน",
};

/**
 * อ่านธีมแล้วเซ็ต data-theme ก่อนเบราว์เซอร์วาดหน้าจอ
 * ถ้าทำใน useEffect หน้าจะกระพริบสีผิดหนึ่งเฟรม (flash of wrong theme)
 *
 * `?theme=dark` เป็น hook สำหรับถ่าย screenshot/ทดสอบ ให้บังคับธีมได้โดยไม่ต้องแตะ localStorage
 * (headless browser มักตั้ง prefers-color-scheme เป็น dark เอง ทำให้ภาพที่ได้ไม่ตรงที่ตั้งใจ)
 */
const themeInitScript = `
document.documentElement.classList.add('js');
try {
  var q = new URLSearchParams(location.search).get('theme');
  var t = q === 'light' || q === 'dark' ? q : localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${anuphan.variable} ${inter.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          ข้ามไปยังเนื้อหาหลัก
        </a>

        <Aurora />

        <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border-default bg-bg-elevated/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-page items-center gap-3 px-4 sm:px-6">
            <Link
              href="/"
              aria-label="Shopping — กลับหน้าแรก"
              className="flex shrink-0 items-center gap-2.5 text-fg transition-opacity hover:opacity-80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent text-accent-fg shadow-accent">
                <FontAwesomeIcon
                  icon={faBagShopping}
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </span>
              {/* จอ 375px ที่ต้องวางทั้ง nav + ตะกร้า + toggle — ตัดคำว่า Shopping ออกก่อน */}
              <span className="hidden text-[15px] font-semibold sm:inline">
                Shopping
              </span>
            </Link>

            <div className="mx-auto sm:mx-0">
              <NavLinks />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <CartLink />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-page flex-1 px-4 py-10 sm:px-6 lg:py-14"
        >
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
