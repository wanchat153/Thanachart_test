import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase } from "@/lib/icons";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border-default bg-bg-elevated/60">
      <div className="mx-auto w-full max-w-page px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-fg">Shopping</p>
            <p className="mt-2 text-sm text-fg-muted">
              ระบบร้านค้าตัวอย่าง — เลือกสินค้า ใส่ตะกร้า และชำระเงินพร้อมตัดสต๊อก
              ในธุรกรรมเดียว
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <p className="text-xs font-medium text-fg-subtle">เมนู</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/"
                    className="text-fg-muted transition-colors hover:text-fg"
                  >
                    รายการสินค้า
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cart"
                    className="text-fg-muted transition-colors hover:text-fg"
                  >
                    ตะกร้าสินค้า
                  </Link>
                </li>
                <li>
                  <Link
                    href="/guide"
                    className="text-fg-muted transition-colors hover:text-fg"
                  >
                    คู่มือใช้งาน
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-2 border-t border-border-default pt-6 text-xs text-fg-subtle">
          <FontAwesomeIcon
            icon={faDatabase}
            className="h-3 w-3 shrink-0"
            aria-hidden="true"
          />
          <p>ราคาและยอดคงเหลือทุกรายการอ่านจากฐานข้อมูลจริงทุกครั้งที่เปิดหน้า</p>
        </div>
      </div>
    </footer>
  );
}
