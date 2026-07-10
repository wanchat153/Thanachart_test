using System.ComponentModel.DataAnnotations;

namespace Thanachart_test.Dtos
{
    /// <summary>
    /// รายการที่ client ขอซื้อ — ส่งมาแค่ code + quantity เท่านั้น
    /// จงใจไม่รับ "ราคา" จาก client เพราะแก้ค่าได้ ราคาจริงอ่านจาก DB ตอน checkout
    /// </summary>
    public class CheckoutItemRequest
    {
        [Required(ErrorMessage = "ต้องระบุรหัสสินค้า")]
        [StringLength(50, MinimumLength = 1, ErrorMessage = "รหัสสินค้าต้องยาว 1-50 ตัวอักษร")]
        public string Code { get; set; } = string.Empty;

        [Range(1, int.MaxValue, ErrorMessage = "จำนวนสั่งซื้อต้องมากกว่า 0")]
        public int Quantity { get; set; }
    }

    public class CheckoutRequest
    {
        [Required(ErrorMessage = "ตะกร้าว่าง")]
        [MinLength(1, ErrorMessage = "ตะกร้าว่าง — ต้องมีสินค้าอย่างน้อย 1 รายการ")]
        public List<CheckoutItemRequest> Items { get; set; } = new();
    }

    /// <param name="ProductCode">รหัสสินค้า</param>
    /// <param name="ProductName">ชื่อสินค้า ณ ตอนซื้อ</param>
    /// <param name="Quantity">จำนวนที่ซื้อ</param>
    /// <param name="UnitPrice">ราคาต่อหน่วย ณ ตอนซื้อ (มาจาก DB)</param>
    /// <param name="SubTotal">Quantity × UnitPrice (คำนวณโดย SQL Server)</param>
    public record CheckoutItemResponse(
        string ProductCode,
        string ProductName,
        int Quantity,
        decimal UnitPrice,
        decimal SubTotal);

    public record CheckoutResponse(
        int OrderId,
        DateTime OrderDate,
        decimal TotalAmount,
        string Status,
        IReadOnlyList<CheckoutItemResponse> Items);
}
