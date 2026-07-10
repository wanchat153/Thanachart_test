using Microsoft.EntityFrameworkCore;
using Thanachart_test.Models;

namespace Thanachart_test.Data
{
    public class ShoppingDbContext : DbContext
    {
        public ShoppingDbContext(DbContextOptions<ShoppingDbContext> options) : base(options)
        {
        }

        public DbSet<Product> Products => Set<Product>();
        public DbSet<Stock> Stocks => Set<Stock>();
        public DbSet<Order> Orders => Set<Order>();
        public DbSet<OrderDetail> OrderDetails => Set<OrderDetail>();
        public DbSet<StockTransaction> StockTransactions => Set<StockTransaction>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Product>(e =>
            {
                e.ToTable("Product");
                e.HasKey(p => p.Code);
                e.Property(p => p.Code).HasMaxLength(50).IsRequired();
                e.Property(p => p.ProductName).HasMaxLength(200).IsRequired();
                e.Property(p => p.UnitPrice).HasColumnType("decimal(18,2)");
                e.ToTable(t => t.HasCheckConstraint("CK_Product_UnitPrice_NonNegative", "[UnitPrice] >= 0"));
            });

            modelBuilder.Entity<Stock>(e =>
            {
                e.ToTable("Stock");
                e.HasKey(s => s.Code);
                e.Property(s => s.Code).HasMaxLength(50).IsRequired();

                // หนึ่งสินค้า = หนึ่งแถวสต๊อก; Code เป็นทั้ง PK และ FK
                e.HasOne(s => s.Product)
                    .WithOne(p => p.Stock)
                    .HasForeignKey<Stock>(s => s.Code)
                    .OnDelete(DeleteBehavior.Cascade);

                // ด่านสุดท้ายกันสต๊อกติดลบ แม้โค้ดจะพลาด DB ก็ปฏิเสธ
                e.ToTable(t => t.HasCheckConstraint("CK_Stock_Quantity_NonNegative", "[StockQuantity] >= 0"));
            });

            modelBuilder.Entity<Order>(e =>
            {
                e.ToTable("Orders");
                e.HasKey(o => o.OrderId);
                e.Property(o => o.OrderId).ValueGeneratedOnAdd();
                e.Property(o => o.OrderDate).HasColumnType("datetime2");
                e.Property(o => o.TotalAmount).HasColumnType("decimal(18,2)");
                e.Property(o => o.Status).HasMaxLength(20).IsRequired();
            });

            modelBuilder.Entity<OrderDetail>(e =>
            {
                e.ToTable("OrderDetails");
                e.HasKey(d => d.OrderDetailId);
                e.Property(d => d.OrderDetailId).ValueGeneratedOnAdd();
                e.Property(d => d.ProductCode).HasMaxLength(50).IsRequired();
                e.Property(d => d.UnitPrice).HasColumnType("decimal(18,2)");

                // SubTotal คำนวณโดย SQL Server เอง (PERSISTED) — แอปเขียนค่าไม่ได้ จึงเพี้ยนไม่ได้
                e.Property(d => d.SubTotal)
                    .HasColumnType("decimal(18,2)")
                    .HasComputedColumnSql("[Quantity] * [UnitPrice]", stored: true);

                e.HasOne(d => d.Order)
                    .WithMany(o => o.OrderDetails)
                    .HasForeignKey(d => d.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(d => d.Product)
                    .WithMany(p => p.OrderDetails)
                    .HasForeignKey(d => d.ProductCode)
                    .OnDelete(DeleteBehavior.Restrict);

                e.ToTable(t => t.HasCheckConstraint("CK_OrderDetails_Quantity_Positive", "[Quantity] > 0"));
            });

            modelBuilder.Entity<StockTransaction>(e =>
            {
                e.ToTable("StockTransaction");
                e.HasKey(t => t.TransactionId);
                e.Property(t => t.TransactionId).ValueGeneratedOnAdd();
                e.Property(t => t.ProductCode).HasMaxLength(50).IsRequired();
                e.Property(t => t.TransactionType).HasMaxLength(20).IsRequired();
                e.Property(t => t.TransactionDate).HasColumnType("datetime2");

                e.HasOne(t => t.Product)
                    .WithMany(p => p.StockTransactions)
                    .HasForeignKey(t => t.ProductCode)
                    .OnDelete(DeleteBehavior.Restrict);

                // OrderId เป็น null ได้ (เช่นการ seed ตั้งต้น ไม่ได้เกิดจากบิล)
                e.HasOne(t => t.Order)
                    .WithMany(o => o.StockTransactions)
                    .HasForeignKey(t => t.OrderId)
                    .IsRequired(false)
                    .OnDelete(DeleteBehavior.Restrict);

                e.HasIndex(t => t.ProductCode);
                e.HasIndex(t => t.OrderId);
            });

            SeedData.Seed(modelBuilder);
        }
    }
}
