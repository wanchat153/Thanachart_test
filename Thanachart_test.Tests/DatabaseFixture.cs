using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Thanachart_test.Data;

namespace Thanachart_test.Tests
{
    /// <summary>
    /// เทสต์ชุดนี้รันกับ SQL Server จริง ไม่ใช่ InMemory provider
    ///
    /// เหตุผล: สิ่งที่เราต้องพิสูจน์คือ transaction, rowcount ของ conditional UPDATE,
    /// computed column และ CHECK constraint — ของพวกนี้ InMemory ไม่มี
    /// เทสต์ที่ผ่านบน InMemory จึงไม่ได้บอกอะไรเลยว่าโค้ดจะไม่ขายเกินสต๊อกจริง
    ///
    /// ใช้ฐานข้อมูลแยกชื่อ Shopping_test_xunit — ไม่แตะ Shopping_test ของจริง
    /// </summary>
    public class DatabaseFixture : IAsyncLifetime
    {
        public const string TestDatabaseName = "Shopping_test_xunit";

        public string ConnectionString { get; private set; } = string.Empty;

        public async Task InitializeAsync()
        {
            ConnectionString = ResolveConnectionString();

            await using var db = CreateContext();

            // เริ่มจาก schema สะอาดทุกครั้ง เพื่อให้ผลเทสต์ทำซ้ำได้
            await db.Database.EnsureDeletedAsync();
            await db.Database.MigrateAsync();
        }

        public async Task DisposeAsync()
        {
            await using var db = CreateContext();
            await db.Database.EnsureDeletedAsync();
        }

        public ShoppingDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<ShoppingDbContext>()
                .UseSqlServer(ConnectionString)
                .Options;

            return new ShoppingDbContext(options);
        }

        /// <summary>
        /// ไม่ hardcode รหัสผ่านลงในโค้ดเทสต์:
        /// อ่านจาก env var ก่อน ถ้าไม่มีค่อยยืมจาก appsettings.Development.json ของโปรเจคหลัก
        /// แล้วเปลี่ยนชื่อฐานข้อมูลเป็นของเทสต์
        /// </summary>
        private static string ResolveConnectionString()
        {
            var fromEnv = Environment.GetEnvironmentVariable("SHOPPING_TEST_CONNECTION");
            if (!string.IsNullOrWhiteSpace(fromEnv))
            {
                return fromEnv;
            }

            var settingsPath = FindDevelopmentSettings()
                ?? throw new InvalidOperationException(
                    "ไม่พบ appsettings.Development.json และไม่ได้ตั้ง env var SHOPPING_TEST_CONNECTION");

            using var json = JsonDocument.Parse(File.ReadAllText(settingsPath));
            var appConnection = json.RootElement
                .GetProperty("ConnectionStrings")
                .GetProperty("Default")
                .GetString();

            if (string.IsNullOrWhiteSpace(appConnection))
            {
                throw new InvalidOperationException("connection string 'Default' ว่างเปล่า");
            }

            return new SqlConnectionStringBuilder(appConnection)
            {
                InitialCatalog = TestDatabaseName,
            }.ConnectionString;
        }

        private static string? FindDevelopmentSettings()
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);

            while (dir is not null)
            {
                var candidate = Path.Combine(
                    dir.FullName, "Thanachart_test", "appsettings.Development.json");

                if (File.Exists(candidate)) return candidate;
                dir = dir.Parent;
            }

            return null;
        }
    }

    /// <summary>เทสต์ทุกตัวใช้ฐานข้อมูลเดียวกัน จึงต้องรันทีละตัว ไม่ขนานกัน</summary>
    [CollectionDefinition(Name)]
    public class DatabaseCollection : ICollectionFixture<DatabaseFixture>
    {
        public const string Name = "Database";
    }
}
