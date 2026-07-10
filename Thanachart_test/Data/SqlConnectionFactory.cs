using Microsoft.Data.SqlClient;

namespace Thanachart_test.Data
{
    public interface ISqlConnectionFactory
    {
        Task<SqlConnection> OpenAsync(CancellationToken cancellationToken);
    }

    /// <summary>
    /// เปิด connection ไปยัง SQL Server สำหรับชั้น CRUD ที่เขียนเป็น SQL string
    ///
    /// EF Core ยังอยู่ในโปรเจคแต่ทำหน้าที่เดียวคือ migrations (คุม schema + seed)
    /// การอ่าน/เขียนข้อมูลตอน runtime ทั้งหมดผ่าน ADO.NET เพื่อให้เห็น SQL ตรง ๆ ตรวจ join/field ได้ง่าย
    /// </summary>
    public sealed class SqlConnectionFactory : ISqlConnectionFactory
    {
        private readonly string _connectionString;

        public SqlConnectionFactory(string connectionString)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new ArgumentException("connection string ว่างเปล่า", nameof(connectionString));
            }
            _connectionString = connectionString;
        }

        public async Task<SqlConnection> OpenAsync(CancellationToken cancellationToken)
        {
            var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            return connection;
        }
    }
}
