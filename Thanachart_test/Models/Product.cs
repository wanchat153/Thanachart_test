namespace Thanachart_test.Models
{
    /// <summary>สินค้า — Code เป็น primary key (รหัสสินค้าที่ธุรกิจใช้จริง ไม่ใช้ surrogate id)</summary>
    public class Product
    {
        public string Code { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;

        public decimal UnitPrice { get; set; }

        public Stock? Stock { get; set; }

        public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

        public ICollection<StockTransaction> StockTransactions { get; set; } = new List<StockTransaction>();
    }
}
