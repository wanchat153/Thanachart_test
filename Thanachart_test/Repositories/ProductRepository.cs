using Microsoft.Data.SqlClient;
using Thanachart_test.Data;
using Thanachart_test.Dtos;

namespace Thanachart_test.Repositories
{
    public interface IProductRepository
    {
        Task<IReadOnlyList<ProductDto>> GetAllAsync(CancellationToken cancellationToken);
    }

    public sealed class ProductRepository : IProductRepository
    {
        private readonly ISqlConnectionFactory _connectionFactory;

        public ProductRepository(ISqlConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        /// <summary>
        /// รายการสินค้าทั้งหมดพร้อมยอดคงเหลือ
        ///
        /// LEFT JOIN (ไม่ใช่ INNER JOIN) เพราะสินค้าที่ยังไม่เคยมีแถวใน Stock ต้องแสดงเป็น 0
        /// ไม่ใช่หายไปจากหน้าร้านเงียบ ๆ
        /// </summary>
        private const string SelectAllSql = @"
SELECT
    p.Code            AS Code,
    p.ProductName     AS ProductName,
    p.UnitPrice       AS UnitPrice,
    ISNULL(s.StockQuantity, 0) AS StockQuantity
FROM dbo.Product AS p
LEFT JOIN dbo.Stock AS s
    ON s.Code = p.Code
ORDER BY p.Code;";

        public async Task<IReadOnlyList<ProductDto>> GetAllAsync(CancellationToken cancellationToken)
        {
            await using var connection = await _connectionFactory.OpenAsync(cancellationToken);
            await using var command = new SqlCommand(SelectAllSql, connection);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            var codeOrdinal = reader.GetOrdinal("Code");
            var nameOrdinal = reader.GetOrdinal("ProductName");
            var priceOrdinal = reader.GetOrdinal("UnitPrice");
            var stockOrdinal = reader.GetOrdinal("StockQuantity");

            var products = new List<ProductDto>();
            while (await reader.ReadAsync(cancellationToken))
            {
                products.Add(new ProductDto(
                    reader.GetString(codeOrdinal),
                    reader.GetString(nameOrdinal),
                    reader.GetDecimal(priceOrdinal),
                    reader.GetInt32(stockOrdinal)));
            }

            return products;
        }
    }
}
