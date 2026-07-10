using System.Data;
using Microsoft.Data.SqlClient;
using Thanachart_test.Data;
using Thanachart_test.Dtos;
using Thanachart_test.Models;

namespace Thanachart_test.Services
{
    public interface ICheckoutService
    {
        Task<CheckoutResult> CheckoutAsync(CheckoutRequest request, CancellationToken cancellationToken);
    }

    /// <summary>
    /// ชำระเงิน: ตัดสต๊อก + สร้างบิล + บันทึกประวัติสต๊อก ภายใน transaction เดียว
    ///
    /// ⚠️ ทุกคำสั่ง SQL ในไฟล์นี้เป็นสตริงคงที่ (const) และค่าจากผู้ใช้ส่งผ่าน SqlParameter เสมอ
    /// ห้ามต่อสตริง SQL กับค่าที่ client ส่งมาเด็ดขาด — เปิดช่อง SQL injection ทันที
    /// </summary>
    public class CheckoutService : ICheckoutService
    {
        private readonly ISqlConnectionFactory _connectionFactory;
        private readonly ILogger<CheckoutService> _logger;
        private readonly TimeProvider _timeProvider;

        public CheckoutService(
            ISqlConnectionFactory connectionFactory,
            ILogger<CheckoutService> logger,
            TimeProvider timeProvider)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
            _timeProvider = timeProvider;
        }

        /// <summary>
        /// ตัดสต๊อกแบบมีเงื่อนไขในคำสั่งเดียว: เช็คและหักพร้อมกัน
        /// ถ้าแยกเป็น SELECT แล้วค่อย UPDATE สองคำขอพร้อมกันจะขายเกินได้
        /// rowcount = 0 แปลว่าของไม่พอ (หรือไม่มีแถวนั้น)
        /// </summary>
        private const string DeductStockSql = @"
UPDATE dbo.Stock
SET StockQuantity = StockQuantity - @Quantity
WHERE Code = @Code
  AND StockQuantity >= @Quantity;";

        private const string SelectStockSql = @"
SELECT s.StockQuantity
FROM dbo.Stock AS s
WHERE s.Code = @Code;";

        /// <summary>SCOPE_IDENTITY() ไม่ใช่ @@IDENTITY — @@IDENTITY จะคืน id จาก trigger ที่ไม่เกี่ยวข้อง</summary>
        private const string InsertOrderSql = @"
INSERT INTO dbo.Orders (OrderDate, TotalAmount, Status)
VALUES (@OrderDate, @TotalAmount, @Status);

SELECT CAST(SCOPE_IDENTITY() AS int);";

        /// <summary>ไม่ใส่ SubTotal — เป็น computed column (PERSISTED) ที่ SQL Server คำนวณเอง</summary>
        private const string InsertOrderDetailSql = @"
INSERT INTO dbo.OrderDetails (OrderId, ProductCode, Quantity, UnitPrice)
VALUES (@OrderId, @ProductCode, @Quantity, @UnitPrice);";

        private const string InsertStockTransactionSql = @"
INSERT INTO dbo.StockTransaction
    (ProductCode, OrderId, ChangeAmount, TransactionType, TransactionDate)
VALUES
    (@ProductCode, @OrderId, @ChangeAmount, @TransactionType, @TransactionDate);";

        public async Task<CheckoutResult> CheckoutAsync(
            CheckoutRequest request,
            CancellationToken cancellationToken)
        {
            if (request.Items.Count == 0)
            {
                return CheckoutResult.Failure(CheckoutStatus.EmptyCart, "ตะกร้าว่าง");
            }

            if (request.Items.Any(i => i.Quantity <= 0))
            {
                return CheckoutResult.Failure(
                    CheckoutStatus.InvalidQuantity, "จำนวนสั่งซื้อต้องมากกว่า 0");
            }

            var duplicate = request.Items
                .GroupBy(i => i.Code, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault(g => g.Count() > 1);
            if (duplicate is not null)
            {
                return CheckoutResult.Failure(
                    CheckoutStatus.DuplicateItems,
                    $"มีรหัสสินค้าซ้ำในตะกร้า: {duplicate.Key}",
                    duplicate.Key);
            }

            // เรียงตามรหัสสินค้าเสมอ เพื่อให้ทุก transaction ล็อกแถวในลำดับเดียวกัน (กัน deadlock)
            var items = request.Items
                .OrderBy(i => i.Code, StringComparer.Ordinal)
                .ToList();

            await using var connection = await _connectionFactory.OpenAsync(cancellationToken);

            // ⚠️ ราคาต้องอ่านจาก DB เท่านั้น — ไม่รับราคาจาก client เพราะแก้ค่าได้
            var products = await LoadProductsAsync(
                connection, items.Select(i => i.Code).ToList(), cancellationToken);

            var missing = items.FirstOrDefault(i => !products.ContainsKey(i.Code));
            if (missing is not null)
            {
                return CheckoutResult.Failure(
                    CheckoutStatus.ProductNotFound,
                    $"ไม่พบสินค้ารหัส {missing.Code}",
                    missing.Code);
            }

            await using var transaction =
                (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);

            try
            {
                foreach (var item in items)
                {
                    var rowsAffected = await DeductStockAsync(
                        connection, transaction, item.Code, item.Quantity, cancellationToken);

                    if (rowsAffected == 0)
                    {
                        // ของไม่พอแม้แต่รายการเดียว = ยกเลิกทั้งบิล ไม่ขายบางส่วน
                        await transaction.RollbackAsync(cancellationToken);

                        var available = await GetStockAsync(connection, item.Code, cancellationToken);

                        _logger.LogWarning(
                            "Checkout ล้มเหลว: สินค้า {Code} ต้องการ {Requested} แต่เหลือ {Available}",
                            item.Code, item.Quantity, available);

                        return CheckoutResult.Failure(
                            CheckoutStatus.InsufficientStock,
                            $"สินค้า {products[item.Code].ProductName} มีไม่พอ " +
                            $"(ต้องการ {item.Quantity} คงเหลือ {available ?? 0})",
                            item.Code);
                    }
                }

                var now = _timeProvider.GetUtcNow().UtcDateTime;
                var totalAmount = items.Sum(i => products[i.Code].UnitPrice * i.Quantity);

                var orderId = await InsertOrderAsync(
                    connection, transaction, now, totalAmount, OrderStatus.Paid, cancellationToken);

                foreach (var item in items)
                {
                    var unitPrice = products[item.Code].UnitPrice; // snapshot ราคาจาก DB

                    await InsertOrderDetailAsync(
                        connection, transaction, orderId, item.Code, item.Quantity, unitPrice,
                        cancellationToken);

                    await InsertStockTransactionAsync(
                        connection, transaction, item.Code, orderId,
                        -item.Quantity, // ติดลบ = ตัดออกจากสต๊อก
                        StockTransactionType.Sale, now, cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);

                _logger.LogInformation(
                    "Checkout สำเร็จ: order {OrderId} ยอดรวม {TotalAmount} จำนวน {ItemCount} รายการ",
                    orderId, totalAmount, items.Count);

                var responseItems = items
                    .Select(i => new CheckoutItemResponse(
                        i.Code,
                        products[i.Code].ProductName,
                        i.Quantity,
                        products[i.Code].UnitPrice,
                        products[i.Code].UnitPrice * i.Quantity))
                    .ToList();

                return CheckoutResult.Success(new CheckoutResponse(
                    orderId, now, totalAmount, OrderStatus.Paid, responseItems));
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }

        private sealed record ProductRow(string Code, string ProductName, decimal UnitPrice);

        /// <summary>
        /// อ่าน Code/ProductName/UnitPrice ของสินค้าที่อยู่ในตะกร้า
        ///
        /// IN (...) สร้าง placeholder ตามจำนวนรายการ (@Code0, @Code1, ...) — ชื่อ parameter
        /// สร้างจาก index ของ loop ไม่ใช่จากข้อมูลผู้ใช้ ค่าจริงถูกส่งผ่าน SqlParameter ทั้งหมด
        /// </summary>
        private static async Task<Dictionary<string, ProductRow>> LoadProductsAsync(
            SqlConnection connection,
            IReadOnlyList<string> codes,
            CancellationToken cancellationToken)
        {
            var placeholders = string.Join(", ", codes.Select((_, index) => $"@Code{index}"));

            var sql = $@"
SELECT
    p.Code        AS Code,
    p.ProductName AS ProductName,
    p.UnitPrice   AS UnitPrice
FROM dbo.Product AS p
WHERE p.Code IN ({placeholders});";

            await using var command = new SqlCommand(sql, connection);
            for (var index = 0; index < codes.Count; index++)
            {
                command.Parameters.Add($"@Code{index}", SqlDbType.NVarChar, 50).Value = codes[index];
            }

            var products = new Dictionary<string, ProductRow>(StringComparer.Ordinal);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var code = reader.GetString(0);
                products[code] = new ProductRow(code, reader.GetString(1), reader.GetDecimal(2));
            }

            return products;
        }

        private static async Task<int> DeductStockAsync(
            SqlConnection connection,
            SqlTransaction transaction,
            string code,
            int quantity,
            CancellationToken cancellationToken)
        {
            await using var command = new SqlCommand(DeductStockSql, connection, transaction);
            command.Parameters.Add("@Code", SqlDbType.NVarChar, 50).Value = code;
            command.Parameters.Add("@Quantity", SqlDbType.Int).Value = quantity;

            return await command.ExecuteNonQueryAsync(cancellationToken);
        }

        /// <summary>อ่านยอดคงเหลือ (นอก transaction ที่ rollback ไปแล้ว) เพื่อบอกผู้ใช้ว่าเหลือเท่าไร</summary>
        private static async Task<int?> GetStockAsync(
            SqlConnection connection,
            string code,
            CancellationToken cancellationToken)
        {
            await using var command = new SqlCommand(SelectStockSql, connection);
            command.Parameters.Add("@Code", SqlDbType.NVarChar, 50).Value = code;

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is null or DBNull ? null : Convert.ToInt32(result);
        }

        private static async Task<int> InsertOrderAsync(
            SqlConnection connection,
            SqlTransaction transaction,
            DateTime orderDate,
            decimal totalAmount,
            string status,
            CancellationToken cancellationToken)
        {
            await using var command = new SqlCommand(InsertOrderSql, connection, transaction);
            command.Parameters.Add("@OrderDate", SqlDbType.DateTime2).Value = orderDate;
            command.Parameters.Add("@TotalAmount", SqlDbType.Decimal).Value = totalAmount;
            command.Parameters["@TotalAmount"].Precision = 18;
            command.Parameters["@TotalAmount"].Scale = 2;
            command.Parameters.Add("@Status", SqlDbType.NVarChar, 20).Value = status;

            var scopeIdentity = await command.ExecuteScalarAsync(cancellationToken);
            if (scopeIdentity is null or DBNull)
            {
                throw new InvalidOperationException("สร้างบิลไม่สำเร็จ: ไม่ได้รับ OrderId กลับมา");
            }

            return Convert.ToInt32(scopeIdentity);
        }

        private static async Task InsertOrderDetailAsync(
            SqlConnection connection,
            SqlTransaction transaction,
            int orderId,
            string productCode,
            int quantity,
            decimal unitPrice,
            CancellationToken cancellationToken)
        {
            await using var command = new SqlCommand(InsertOrderDetailSql, connection, transaction);
            command.Parameters.Add("@OrderId", SqlDbType.Int).Value = orderId;
            command.Parameters.Add("@ProductCode", SqlDbType.NVarChar, 50).Value = productCode;
            command.Parameters.Add("@Quantity", SqlDbType.Int).Value = quantity;
            command.Parameters.Add("@UnitPrice", SqlDbType.Decimal).Value = unitPrice;
            command.Parameters["@UnitPrice"].Precision = 18;
            command.Parameters["@UnitPrice"].Scale = 2;

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        private static async Task InsertStockTransactionAsync(
            SqlConnection connection,
            SqlTransaction transaction,
            string productCode,
            int orderId,
            int changeAmount,
            string transactionType,
            DateTime transactionDate,
            CancellationToken cancellationToken)
        {
            await using var command = new SqlCommand(InsertStockTransactionSql, connection, transaction);
            command.Parameters.Add("@ProductCode", SqlDbType.NVarChar, 50).Value = productCode;
            command.Parameters.Add("@OrderId", SqlDbType.Int).Value = orderId;
            command.Parameters.Add("@ChangeAmount", SqlDbType.Int).Value = changeAmount;
            command.Parameters.Add("@TransactionType", SqlDbType.NVarChar, 20).Value = transactionType;
            command.Parameters.Add("@TransactionDate", SqlDbType.DateTime2).Value = transactionDate;

            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }
}
