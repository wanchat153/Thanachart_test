using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Thanachart_test.Data
{
    /// <summary>
    /// ใช้ตอน design-time เท่านั้น (`dotnet ef migrations add`, `dotnet ef database update`)
    ///
    /// จำเป็นเพราะ Program.cs ไม่ได้ลงทะเบียน AddDbContext แล้ว — runtime ใช้ ADO.NET ล้วน
    /// EF เหลือหน้าที่เดียวคือคุม schema ผ่าน migrations
    /// </summary>
    public class ShoppingDbContextFactory : IDesignTimeDbContextFactory<ShoppingDbContext>
    {
        public ShoppingDbContext CreateDbContext(string[] args)
        {
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                              ?? "Development";

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile($"appsettings.{environment}.json", optional: true)
                .AddEnvironmentVariables()
                .Build();

            var connectionString = configuration.GetConnectionString("Default");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "ไม่พบ connection string 'Default' สำหรับ design-time — " +
                    "รันจากโฟลเดอร์ Thanachart_test หรือใช้ --project ให้ถูก");
            }

            var options = new DbContextOptionsBuilder<ShoppingDbContext>()
                .UseSqlServer(connectionString)
                .Options;

            return new ShoppingDbContext(options);
        }
    }
}
