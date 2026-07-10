namespace Thanachart_test.Dtos
{
    /// <summary>
    /// สินค้า 1 รายการพร้อมยอดคงเหลือ — รูปแบบที่ frontend ใช้แสดงหน้าร้าน
    /// ใช้ DTO แทนการคืน entity ตรง ๆ เพื่อไม่ให้ navigation property วนลูปตอน serialize
    /// </summary>
    /// <param name="Code">รหัสสินค้า</param>
    /// <param name="ProductName">ชื่อสินค้า</param>
    /// <param name="UnitPrice">ราคาขายต่อหน่วย</param>
    /// <param name="StockQuantity">จำนวนคงเหลือในสต๊อก</param>
    public record ProductDto(
        string Code,
        string ProductName,
        decimal UnitPrice,
        int StockQuantity);
}
