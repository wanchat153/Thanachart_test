using Microsoft.EntityFrameworkCore;
using Thanachart_test.Models;

namespace Thanachart_test.Data
{
    /// <summary>
    /// Mock data ที่ฝังไปกับ migration (ไม่มีหน้าจัดการนำเข้าข้อมูล)
    /// ค่าทุกตัวต้องเป็นค่าคงที่ ห้ามใช้ DateTime.Now ไม่งั้น EF จะมองว่า model เปลี่ยนทุกครั้งที่ build
    /// </summary>
    public static class SeedData
    {
        private static readonly DateTime SeedDate = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        private sealed record SeedItem(string Code, string ProductName, decimal UnitPrice, int Quantity);

        private static readonly SeedItem[] Items =
        {
            new("P001", "โน้ตบุ๊ก ThinkPad X1 Carbon", 45900.00m, 12),
            new("P002", "เมาส์ไร้สาย Logitech MX Master 3S", 3290.50m, 40),
            new("P003", "คีย์บอร์ด Keychron K2 (Hot-swap)", 3890.00m, 25),
            new("P004", "จอมอนิเตอร์ Dell 27\" 4K", 15900.00m, 8),
            new("P005", "หูฟัง Sony WH-1000XM5", 12990.75m, 15),
            new("P006", "เว็บแคม Logitech C920", 2490.00m, 30),
            new("P007", "SSD Samsung 990 Pro 1TB", 4590.25m, 50),
            new("P008", "แรม Corsair DDR5 32GB", 4290.00m, 20),

            // ── เคสทดสอบที่จงใจใส่ไว้ ──
            // ของหมด: กดเพิ่มลงตะกร้าไม่ได้เลย
            new("P009", "การ์ดจอ RTX 4090 (ของหมด)", 89900.00m, 0),
            // เหลือน้อย: กดเพิ่มได้แค่ 3 ครั้งแล้วปุ่มต้อง disable
            new("P010", "ด็อกกิ้ง Thunderbolt 4 (เหลือน้อย)", 8990.00m, 3),
            // ราคาถูกมาก + เศษสตางค์: ทดสอบ decimal ไม่เพี้ยน
            new("P011", "สาย USB-C to USB-C 1m", 199.99m, 200),
            new("P012", "แผ่นรองเมาส์ ขนาดใหญ่", 350.50m, 100),
        };

        public static void Seed(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Product>().HasData(
                Items.Select(i => new Product
                {
                    Code = i.Code,
                    ProductName = i.ProductName,
                    UnitPrice = i.UnitPrice,
                }));

            modelBuilder.Entity<Stock>().HasData(
                Items.Select(i => new Stock
                {
                    Code = i.Code,
                    StockQuantity = i.Quantity,
                }));

            // ทุกการเปลี่ยนแปลงของ Stock ต้องมีร่องรอยใน StockTransaction — รวมถึงยอดตั้งต้น
            modelBuilder.Entity<StockTransaction>().HasData(
                Items.Select((i, index) => new StockTransaction
                {
                    TransactionId = index + 1,
                    ProductCode = i.Code,
                    OrderId = null,
                    ChangeAmount = i.Quantity,
                    TransactionType = StockTransactionType.Seed,
                    TransactionDate = SeedDate,
                }));
        }
    }
}
