namespace Thanachart_test.Models
{
    /// <summary>สถานะบิล — เฟสแรก checkout = ชำระเงินทันที จึงมีแค่ Paid</summary>
    public static class OrderStatus
    {
        public const string Paid = "Paid";
    }

    /// <summary>หัวบิล (เลขที่ order, วันเวลาที่สั่งซื้อ+ชำระเงิน, ยอดรวม, สถานะ)</summary>
    public class Order
    {
        public int OrderId { get; set; }

        public DateTime OrderDate { get; set; }

        public decimal TotalAmount { get; set; }

        public string Status { get; set; } = OrderStatus.Paid;

        public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

        public ICollection<StockTransaction> StockTransactions { get; set; } = new List<StockTransaction>();
    }
}
