namespace Thanachart_test.Models
{
    /// <summary>จำนวนคงเหลือในสต๊อก — หนึ่งแถวต่อหนึ่งสินค้า (Code เป็นทั้ง PK และ FK ไป Product)</summary>
    public class Stock
    {
        public string Code { get; set; } = string.Empty;

        /// <summary>คงเหลือปัจจุบัน — DB บังคับ CHECK (StockQuantity >= 0) กันติดลบ</summary>
        public int StockQuantity { get; set; }

        public Product? Product { get; set; }
    }
}
