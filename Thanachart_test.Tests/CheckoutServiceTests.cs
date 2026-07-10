using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Thanachart_test.Data;
using Thanachart_test.Dtos;
using Thanachart_test.Models;
using Thanachart_test.Services;

namespace Thanachart_test.Tests
{
    [Collection(DatabaseCollection.Name)]
    public class CheckoutServiceTests
    {
        private static readonly DateTimeOffset FixedNow =
            new(2026, 7, 10, 8, 30, 0, TimeSpan.Zero);

        private readonly DatabaseFixture _fixture;

        public CheckoutServiceTests(DatabaseFixture fixture) => _fixture = fixture;

        /// <summary>
        /// production เขียน/อ่านด้วย SQL string (ADO.NET) ส่วนเทสต์ยืนยันผลด้วย EF LINQ
        /// จงใจใช้คนละกลไก — ถ้า SQL เขียนผิด เทสต์ที่อ่านด้วย EF จะจับได้ ไม่ผิดตามกันไป
        /// </summary>
        private CheckoutService CreateService() =>
            new(new SqlConnectionFactory(_fixture.ConnectionString),
                NullLogger<CheckoutService>.Instance,
                new FixedTimeProvider(FixedNow));

        /// <summary>ล้างบิลเก่าและตั้งสต๊อกกลับเป็นค่าที่ต้องการ ก่อนเริ่มแต่ละเทสต์</summary>
        private async Task ResetAsync(params (string Code, int Quantity)[] stock)
        {
            await using var db = _fixture.CreateContext();

            await db.Database.ExecuteSqlRawAsync("DELETE FROM StockTransaction WHERE OrderId IS NOT NULL");
            await db.Database.ExecuteSqlRawAsync("DELETE FROM OrderDetails");
            await db.Database.ExecuteSqlRawAsync("DELETE FROM Orders");

            foreach (var (code, quantity) in stock)
            {
                await db.Database.ExecuteSqlInterpolatedAsync(
                    $"UPDATE Stock SET StockQuantity = {quantity} WHERE Code = {code}");
            }
        }

        private async Task<int> GetStockAsync(string code)
        {
            await using var db = _fixture.CreateContext();
            return await db.Stocks.AsNoTracking()
                .Where(s => s.Code == code)
                .Select(s => s.StockQuantity)
                .SingleAsync();
        }

        private static CheckoutRequest Request(params (string Code, int Quantity)[] items) =>
            new()
            {
                Items = items
                    .Select(i => new CheckoutItemRequest { Code = i.Code, Quantity = i.Quantity })
                    .ToList(),
            };

        // ─────────────────────────────────────────────────────────────
        // เส้นทางสำเร็จ
        // ─────────────────────────────────────────────────────────────

        [Fact]
        public async Task Checkout_สำเร็จ_ตัดสต๊อกและสร้างบิลครบทุกตาราง()
        {
            await ResetAsync(("P001", 10));

            var result = await CreateService().CheckoutAsync(Request(("P001", 3)), default);

            Assert.True(result.IsSuccess);
            Assert.Equal(CheckoutStatus.Success, result.Status);

            // สต๊อกถูกตัด 10 -> 7
            Assert.Equal(7, await GetStockAsync("P001"));

            await using var verify = _fixture.CreateContext();
            var orderId = result.Response!.OrderId;

            var order = await verify.Orders.SingleAsync(o => o.OrderId == orderId);
            Assert.Equal(OrderStatus.Paid, order.Status);
            Assert.Equal(FixedNow.UtcDateTime, order.OrderDate);
            Assert.Equal(45900.00m * 3, order.TotalAmount);

            var detail = await verify.OrderDetails.SingleAsync(d => d.OrderId == orderId);
            Assert.Equal("P001", detail.ProductCode);
            Assert.Equal(3, detail.Quantity);
            Assert.Equal(45900.00m, detail.UnitPrice);

            var transaction = await verify.StockTransactions
                .SingleAsync(t => t.OrderId == orderId);
            Assert.Equal("P001", transaction.ProductCode);
            Assert.Equal(-3, transaction.ChangeAmount); // ติดลบ = ตัดออก
            Assert.Equal(StockTransactionType.Sale, transaction.TransactionType);
            Assert.Equal(FixedNow.UtcDateTime, transaction.TransactionDate);
        }

        [Fact]
        public async Task SubTotal_ถูกคำนวณโดย_SQL_Server_ไม่ใช่โดยแอป()
        {
            await ResetAsync(("P011", 100));

            // P011 ราคา 199.99 x 3 = 599.97 เป๊ะ (ถ้าเป็น float จะได้ 599.9700000000001)
            var result = await CreateService().CheckoutAsync(Request(("P011", 3)), default);
            Assert.True(result.IsSuccess);

            await using var verify = _fixture.CreateContext();
            var detail = await verify.OrderDetails
                .SingleAsync(d => d.OrderId == result.Response!.OrderId);

            Assert.Equal(199.99m, detail.UnitPrice);
            Assert.Equal(599.97m, detail.SubTotal);
            Assert.Equal(detail.Quantity * detail.UnitPrice, detail.SubTotal);
        }

        [Fact]
        public async Task ซื้อได้พอดีจนสต๊อกเหลือศูนย์()
        {
            await ResetAsync(("P010", 3));

            var result = await CreateService().CheckoutAsync(Request(("P010", 3)), default);

            Assert.True(result.IsSuccess);
            Assert.Equal(0, await GetStockAsync("P010"));
        }

        // ─────────────────────────────────────────────────────────────
        // กันขายเกินสต๊อก
        // ─────────────────────────────────────────────────────────────

        [Fact]
        public async Task ของไม่พอ_ตอบ_InsufficientStock_และสต๊อกไม่ถูกแตะเลย()
        {
            await ResetAsync(("P010", 3));

            var result = await CreateService().CheckoutAsync(Request(("P010", 4)), default);

            Assert.False(result.IsSuccess);
            Assert.Equal(CheckoutStatus.InsufficientStock, result.Status);
            Assert.Equal("P010", result.ProductCode);

            Assert.Equal(3, await GetStockAsync("P010")); // ต้องไม่ลดลงแม้แต่นิดเดียว

            await using var verify = _fixture.CreateContext();
            Assert.Equal(0, await verify.Orders.CountAsync());
            Assert.Equal(0, await verify.OrderDetails.CountAsync());
        }

        [Fact]
        public async Task สินค้าหมด_ซื้อไม่ได้()
        {
            await ResetAsync(("P009", 0));

            var result = await CreateService().CheckoutAsync(Request(("P009", 1)), default);

            Assert.Equal(CheckoutStatus.InsufficientStock, result.Status);
            Assert.Equal(0, await GetStockAsync("P009"));
        }

        [Fact]
        public async Task บิลหลายรายการ_รายการหลังของไม่พอ_ต้อง_rollback_ทั้งบิล()
        {
            // P001 พอ (ตัดสำเร็จก่อน) แต่ P010 ไม่พอ -> P001 ต้องถูกคืนกลับ
            await ResetAsync(("P001", 10), ("P010", 1));

            var result = await CreateService()
                .CheckoutAsync(Request(("P001", 2), ("P010", 5)), default);

            Assert.Equal(CheckoutStatus.InsufficientStock, result.Status);
            Assert.Equal("P010", result.ProductCode);

            // หัวใจของเทสต์นี้: P001 ต้องไม่ถูกตัด แม้ UPDATE ของมันจะสำเร็จไปแล้วก่อน rollback
            Assert.Equal(10, await GetStockAsync("P001"));
            Assert.Equal(1, await GetStockAsync("P010"));

            await using var verify = _fixture.CreateContext();
            Assert.Equal(0, await verify.Orders.CountAsync());
            Assert.Equal(0, await verify.StockTransactions.CountAsync(t => t.OrderId != null));
        }

        // ─────────────────────────────────────────────────────────────
        // ความปลอดภัย: ราคามาจาก DB เท่านั้น
        // ─────────────────────────────────────────────────────────────

        [Fact]
        public async Task ราคาที่บันทึกลงบิล_มาจาก_DB_เสมอ_ไม่ใช่ค่าที่_client_ส่งมา()
        {
            await ResetAsync(("P001", 10));

            // เปลี่ยนราคาใน DB แล้วต้องเห็นราคาใหม่ในบิล พิสูจน์ว่าอ่านจาก DB จริง
            await using (var seed = _fixture.CreateContext())
            {
                await seed.Database.ExecuteSqlRawAsync(
                    "UPDATE Product SET UnitPrice = 1.00 WHERE Code = 'P001'");
            }

            var result = await CreateService().CheckoutAsync(Request(("P001", 2)), default);

            Assert.True(result.IsSuccess);
            Assert.Equal(2.00m, result.Response!.TotalAmount);

            await using var verify = _fixture.CreateContext();
            var detail = await verify.OrderDetails
                .SingleAsync(d => d.OrderId == result.Response.OrderId);
            Assert.Equal(1.00m, detail.UnitPrice);

            // คืนราคาเดิมไม่ให้กระทบเทสต์อื่น
            await using var restore = _fixture.CreateContext();
            await restore.Database.ExecuteSqlRawAsync(
                "UPDATE Product SET UnitPrice = 45900.00 WHERE Code = 'P001'");
        }

        // ─────────────────────────────────────────────────────────────
        // การตรวจสอบคำขอ
        // ─────────────────────────────────────────────────────────────

        [Fact]
        public async Task ตะกร้าว่าง_ตอบ_EmptyCart()
        {
            var result = await CreateService().CheckoutAsync(Request(), default);
            Assert.Equal(CheckoutStatus.EmptyCart, result.Status);
        }

        [Fact]
        public async Task สินค้าไม่มีในระบบ_ตอบ_ProductNotFound()
        {
            var result = await CreateService().CheckoutAsync(Request(("ไม่มีจริง", 1)), default);

            Assert.Equal(CheckoutStatus.ProductNotFound, result.Status);
            Assert.Equal("ไม่มีจริง", result.ProductCode);
        }

        [Fact]
        public async Task รหัสสินค้าซ้ำในตะกร้า_ตอบ_DuplicateItems()
        {
            var result = await CreateService()
                .CheckoutAsync(Request(("P001", 1), ("P001", 2)), default);

            Assert.Equal(CheckoutStatus.DuplicateItems, result.Status);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public async Task จำนวนสั่งซื้อไม่เป็นบวก_ตอบ_InvalidQuantity(int quantity)
        {
            var result = await CreateService().CheckoutAsync(Request(("P001", quantity)), default);
            Assert.Equal(CheckoutStatus.InvalidQuantity, result.Status);
        }

        // ─────────────────────────────────────────────────────────────
        // Concurrency — หัวใจของการกันขายเกิน
        // ─────────────────────────────────────────────────────────────

        [Fact]
        public async Task สองคำขอพร้อมกันแย่งของชิ้นสุดท้าย_สำเร็จได้แค่หนึ่ง_สต๊อกไม่ติดลบ()
        {
            await ResetAsync(("P010", 1)); // เหลือชิ้นเดียว

            async Task<CheckoutResult> Buy()
            {
                return await CreateService().CheckoutAsync(Request(("P010", 1)), default);
            }

            var results = await Task.WhenAll(Buy(), Buy());

            Assert.Equal(1, results.Count(r => r.IsSuccess));
            Assert.Equal(1, results.Count(r => r.Status == CheckoutStatus.InsufficientStock));

            Assert.Equal(0, await GetStockAsync("P010")); // ไม่ติดลบ

            await using var verify = _fixture.CreateContext();
            Assert.Equal(1, await verify.Orders.CountAsync());
        }

        [Fact]
        public async Task หลายคำขอพร้อมกัน_ขายรวมกันไม่เกินสต๊อกที่มี()
        {
            const int initialStock = 5;
            const int concurrentBuyers = 10;
            await ResetAsync(("P002", initialStock));

            async Task<CheckoutResult> Buy()
            {
                return await CreateService().CheckoutAsync(Request(("P002", 1)), default);
            }

            var results = await Task.WhenAll(
                Enumerable.Range(0, concurrentBuyers).Select(_ => Buy()));

            var succeeded = results.Count(r => r.IsSuccess);

            Assert.Equal(initialStock, succeeded); // ขายได้พอดี 5 ไม่มากไม่น้อย
            Assert.Equal(0, await GetStockAsync("P002"));

            await using var verify = _fixture.CreateContext();
            Assert.Equal(initialStock, await verify.Orders.CountAsync());

            var totalSold = await verify.StockTransactions
                .Where(t => t.OrderId != null && t.ProductCode == "P002")
                .SumAsync(t => -t.ChangeAmount);
            Assert.Equal(initialStock, totalSold);
        }
    }
}
