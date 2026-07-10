namespace Thanachart_test.Models
{
    /// <summary>รายการสินค้าในบิล</summary>
    public class OrderDetail
    {
        public int OrderDetailId { get; set; }

        public int OrderId { get; set; }

        public string ProductCode { get; set; } = string.Empty;

        public int Quantity { get; set; }

        /// <summary>ราคา ณ ตอนซื้อ (snapshot) — ราคาสินค้าเปลี่ยนทีหลังไม่กระทบบิลเก่า</summary>
        public decimal UnitPrice { get; set; }

        /// <summary>
        /// Quantity × UnitPrice — เป็น computed column (PERSISTED) ฝั่ง DB
        /// จึงคำนวณผิดไม่ได้ และแอปไม่ต้องเขียนค่าเอง
        /// </summary>
        public decimal SubTotal { get; private set; }

        public Order? Order { get; set; }

        public Product? Product { get; set; }
    }
}
