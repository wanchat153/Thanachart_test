const bahtFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** จัดรูปแบบเงินบาท เช่น 199.99 -> "฿199.99" */
export function formatBaht(value: number): string {
  return bahtFormatter.format(value);
}

const numberFormatter = new Intl.NumberFormat("th-TH");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
