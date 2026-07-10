import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CheckoutOrder } from "@/lib/api";
import { faCheck } from "@/lib/icons";
import { formatBaht, formatNumber } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CheckoutSummary({ order }: { order: CheckoutOrder }) {
  const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <FontAwesomeIcon
            icon={faCheck}
            className="h-6 w-6"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-3xl font-semibold text-fg">ชำระเงินเรียบร้อย</h1>
        <p className="mt-3 text-sm text-fg-muted">
          เลขที่คำสั่งซื้อ{" "}
          <span className="font-numeric font-medium text-fg">
            #{order.orderId}
          </span>
          {" · "}
          {dateFormatter.format(new Date(order.orderDate))}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-default bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-xs text-fg-subtle">
                <th className="px-5 py-3 font-medium">สินค้า</th>
                <th className="px-5 py-3 text-right font-medium">จำนวน</th>
                <th className="px-5 py-3 text-right font-medium">
                  ราคาต่อหน่วย
                </th>
                <th className="px-5 py-3 text-right font-medium">รวม</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr
                  key={item.productCode}
                  className="border-b border-border-default last:border-0"
                >
                  <td className="px-5 py-4">
                    <span className="block font-numeric text-xs text-fg-subtle">
                      {item.productCode}
                    </span>
                    <span className="font-medium text-fg">
                      {item.productName}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-numeric text-fg tabular-nums">
                    {formatNumber(item.quantity)}
                  </td>
                  <td className="px-5 py-4 text-right font-numeric text-fg-muted tabular-nums">
                    {formatBaht(item.unitPrice)}
                  </td>
                  <td className="px-5 py-4 text-right font-numeric font-medium text-fg tabular-nums">
                    {formatBaht(item.subTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-default bg-surface-2 px-5 py-5">
          <div className="text-sm text-fg-muted">
            รวม {formatNumber(totalItems)} ชิ้น
            <span className="mx-2 text-fg-subtle">·</span>
            สถานะ{" "}
            <span className="font-medium text-success">{order.status}</span>
          </div>
          <div className="text-right">
            <span className="block text-xs text-fg-subtle">ยอดชำระ</span>
            <span
              data-testid="order-total"
              className="font-numeric text-2xl font-semibold text-fg tabular-nums"
            >
              {formatBaht(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-fg-subtle">
        ราคาที่แสดงคือราคา ณ เวลาที่สั่งซื้อ (บันทึกไว้ในบิลแล้ว)
        ไม่ใช่ราคาปัจจุบันของสินค้า
      </p>

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-sm bg-accent px-6 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover hover:shadow-accent"
        >
          เลือกสินค้าต่อ
        </Link>
      </div>
    </div>
  );
}
