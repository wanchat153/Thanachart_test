/**
 * API client สำหรับ backend ASP.NET Core
 *
 * กฎเหล็กของโปรเจค: ข้อมูลสินค้า/ราคา/สต๊อก ต้องมาจาก database ผ่าน API เท่านั้น
 * ห้าม hardcode รายการสินค้าไว้ในฝั่ง frontend เด็ดขาด
 */

/** ตรงกับ ProductDto ฝั่ง backend (Thanachart_test/Dtos/ProductDto.cs) */
export interface Product {
  code: string;
  productName: string;
  unitPrice: number;
  stockQuantity: number;
}

/** ตรงกับ CheckoutItemResponse ฝั่ง backend */
export interface CheckoutItem {
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}

/** ตรงกับ CheckoutResponse ฝั่ง backend */
export interface CheckoutOrder {
  orderId: number;
  orderDate: string;
  totalAmount: number;
  status: string;
  items: CheckoutItem[];
}

/** เหตุผลที่ backend ปฏิเสธ (ตรงกับ enum CheckoutStatus) */
export type CheckoutFailureReason =
  | "EmptyCart"
  | "DuplicateItems"
  | "InvalidQuantity"
  | "ProductNotFound"
  | "InsufficientStock";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** มีค่าเมื่อ backend ตอบ ProblemDetails ที่ระบุสาเหตุ */
    readonly reason?: CheckoutFailureReason,
    readonly productCode?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** ของหมดระหว่างทาง (มีคนซื้อตัดหน้า) — ตะกร้าต้องไม่ถูกล้าง */
  get isStockConflict(): boolean {
    return this.status === 409 || this.reason === "InsufficientStock";
  }
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5126";

/**
 * แปลง error ของ fetch ที่ปกติบอกแค่ "fetch failed" ให้เป็นข้อความที่ระบุสาเหตุได้จริง
 *
 * เคยเสียเวลาไปมากเพราะหน้าเว็บขึ้นว่า "backend ไม่ได้รัน" ทั้งที่ backend รันอยู่ดี ๆ
 * (ต้นเหตุจริงคือ HTTPS redirect ของ launch profile "https" — ดู Program.cs)
 */
export function describeFetchError(error: unknown): string {
  const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
  const code = cause?.code;

  if (code === "ECONNREFUSED") {
    return "backend ไม่ได้รัน หรือรันคนละพอร์ต (ECONNREFUSED)";
  }
  if (code?.startsWith("DEPTH_ZERO") || code?.includes("CERT") || code === "SELF_SIGNED_CERT_IN_CHAIN") {
    return `ใบรับรอง HTTPS ไม่ผ่านการตรวจ (${code}) — ถ้า base URL ชี้ไป https ให้รัน \`dotnet dev-certs https --trust\``;
  }

  const detail = cause?.message ?? (error instanceof Error ? error.message : String(error));
  return `${detail} — ถ้า backend รันอยู่แต่ยังเชื่อมไม่ได้ ให้ตรวจว่า ${API_BASE_URL} ตอบ 307 (HTTPS redirect) หรือไม่`;
}

/**
 * ดึงรายการสินค้าพร้อมยอดคงเหลือ
 *
 * ใช้ cache: "no-store" เพราะสต๊อกเปลี่ยนได้ตลอด — ถ้า cache ไว้ผู้ใช้จะเห็นยอดเก่า
 * แล้วกดสั่งของที่หมดไปแล้ว (Next 16 ไม่ cache fetch โดย default อยู่แล้ว แต่ระบุให้ชัดเจน)
 */
export async function fetchProducts(): Promise<Product[]> {
  const url = `${API_BASE_URL}/api/products`;

  let res: Response;
  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    // status 0 = ไปไม่ถึง server (ต่างจาก server ตอบ error กลับมา)
    // ไม่ใส่ URL ซ้ำ เพราะหน้าที่เรียกแสดง URL ให้อยู่แล้ว
    throw new ApiError(describeFetchError(error), 0);
  }

  if (!res.ok) {
    throw new ApiError(`ได้ HTTP ${res.status} แทนที่จะเป็น 200`, res.status);
  }

  return (await res.json()) as Product[];
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  reason?: CheckoutFailureReason;
  productCode?: string;
  errors?: Record<string, string[]>;
}

/**
 * ชำระเงิน
 *
 * ส่งเฉพาะ code + quantity — ไม่ส่งราคา เพราะ backend อ่านราคาจาก DB เสมอ
 * (ถ้าส่งราคาไปก็ถูกเมิน แต่ส่งไปทำไมให้คนเข้าใจผิดว่ามันมีผล)
 */
export async function checkout(
  items: readonly { code: string; quantity: number }[],
): Promise<CheckoutOrder> {
  const url = `${API_BASE_URL}/api/checkout`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        items: items.map((i) => ({ code: i.code, quantity: i.quantity })),
      }),
    });
  } catch (error) {
    // ในเบราว์เซอร์ CORS ที่ล้มจะได้แค่ "Failed to fetch" ไม่มีรายละเอียด
    // สาเหตุที่พบบ่อยคือ preflight (OPTIONS) โดน 307 เด้งไป https
    throw new ApiError(
      `เรียก ${url} ไม่สำเร็จ: ${describeFetchError(error)}`,
      0,
    );
  }

  if (res.ok) {
    return (await res.json()) as CheckoutOrder;
  }

  throw await toApiError(res);
}

async function toApiError(res: Response): Promise<ApiError> {
  let problem: ProblemDetails | null = null;
  try {
    problem = (await res.json()) as ProblemDetails;
  } catch {
    // backend ตอบอะไรที่ไม่ใช่ JSON — ใช้ข้อความสำรองด้านล่าง
  }

  // ASP.NET ตอบ validation error เป็น errors: { field: [messages] }
  const validationMessage = problem?.errors
    ? Object.values(problem.errors).flat().join(" · ")
    : undefined;

  const message =
    validationMessage ||
    problem?.detail ||
    problem?.title ||
    `ชำระเงินไม่สำเร็จ (HTTP ${res.status})`;

  return new ApiError(message, res.status, problem?.reason, problem?.productCode);
}
