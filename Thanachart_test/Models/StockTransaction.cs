namespace Thanachart_test.Models
{
    public static class StockTransactionType
    {
        /// <summary>ตัดสต๊อกจากการขาย (ChangeAmount ติดลบ)</summary>
        public const string Sale = "Sale";

        /// <summary>ตั้งต้นสต๊อกตอน seed (ChangeAmount เป็นบวก)</summary>
        public const string Seed = "Seed";
    }

    /// <summary>ประวัติการเคลื่อนไหวของสต๊อก — ทุกครั้งที่ Stock.StockQuantity เปลี่ยน ต้องมีแถวที่นี่</summary>
    public class StockTransaction
    {
        public int TransactionId { get; set; }

        public string ProductCode { get; set; } = string.Empty;

        /// <summary>บิลที่ทำให้สต๊อกเปลี่ยน — null ได้ (เช่น Seed ไม่ได้มาจากบิล)</summary>
        public int? OrderId { get; set; }

        /// <summary>จำนวนที่เปลี่ยน มีเครื่องหมาย: ลบ = ตัดออก, บวก = เพิ่มเข้า</summary>
        public int ChangeAmount { get; set; }

        public string TransactionType { get; set; } = string.Empty;

        public DateTime TransactionDate { get; set; }

        public Product? Product { get; set; }

        public Order? Order { get; set; }
    }
}
