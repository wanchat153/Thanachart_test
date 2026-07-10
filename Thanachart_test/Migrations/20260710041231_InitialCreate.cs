using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Thanachart_test.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    OrderId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.OrderId);
                });

            migrationBuilder.CreateTable(
                name: "Product",
                columns: table => new
                {
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ProductName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Product", x => x.Code);
                    table.CheckConstraint("CK_Product_UnitPrice_NonNegative", "[UnitPrice] >= 0");
                });

            migrationBuilder.CreateTable(
                name: "OrderDetails",
                columns: table => new
                {
                    OrderDetailId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    ProductCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false, computedColumnSql: "[Quantity] * [UnitPrice]", stored: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderDetails", x => x.OrderDetailId);
                    table.CheckConstraint("CK_OrderDetails_Quantity_Positive", "[Quantity] > 0");
                    table.ForeignKey(
                        name: "FK_OrderDetails_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderDetails_Product_ProductCode",
                        column: x => x.ProductCode,
                        principalTable: "Product",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Stock",
                columns: table => new
                {
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StockQuantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stock", x => x.Code);
                    table.CheckConstraint("CK_Stock_Quantity_NonNegative", "[StockQuantity] >= 0");
                    table.ForeignKey(
                        name: "FK_Stock_Product_Code",
                        column: x => x.Code,
                        principalTable: "Product",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StockTransaction",
                columns: table => new
                {
                    TransactionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OrderId = table.Column<int>(type: "int", nullable: true),
                    ChangeAmount = table.Column<int>(type: "int", nullable: false),
                    TransactionType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TransactionDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockTransaction", x => x.TransactionId);
                    table.ForeignKey(
                        name: "FK_StockTransaction_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StockTransaction_Product_ProductCode",
                        column: x => x.ProductCode,
                        principalTable: "Product",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Product",
                columns: new[] { "Code", "ProductName", "UnitPrice" },
                values: new object[,]
                {
                    { "P001", "โน้ตบุ๊ก ThinkPad X1 Carbon", 45900.00m },
                    { "P002", "เมาส์ไร้สาย Logitech MX Master 3S", 3290.50m },
                    { "P003", "คีย์บอร์ด Keychron K2 (Hot-swap)", 3890.00m },
                    { "P004", "จอมอนิเตอร์ Dell 27\" 4K", 15900.00m },
                    { "P005", "หูฟัง Sony WH-1000XM5", 12990.75m },
                    { "P006", "เว็บแคม Logitech C920", 2490.00m },
                    { "P007", "SSD Samsung 990 Pro 1TB", 4590.25m },
                    { "P008", "แรม Corsair DDR5 32GB", 4290.00m },
                    { "P009", "การ์ดจอ RTX 4090 (ของหมด)", 89900.00m },
                    { "P010", "ด็อกกิ้ง Thunderbolt 4 (เหลือน้อย)", 8990.00m },
                    { "P011", "สาย USB-C to USB-C 1m", 199.99m },
                    { "P012", "แผ่นรองเมาส์ ขนาดใหญ่", 350.50m }
                });

            migrationBuilder.InsertData(
                table: "Stock",
                columns: new[] { "Code", "StockQuantity" },
                values: new object[,]
                {
                    { "P001", 12 },
                    { "P002", 40 },
                    { "P003", 25 },
                    { "P004", 8 },
                    { "P005", 15 },
                    { "P006", 30 },
                    { "P007", 50 },
                    { "P008", 20 },
                    { "P009", 0 },
                    { "P010", 3 },
                    { "P011", 200 },
                    { "P012", 100 }
                });

            migrationBuilder.InsertData(
                table: "StockTransaction",
                columns: new[] { "TransactionId", "ChangeAmount", "OrderId", "ProductCode", "TransactionDate", "TransactionType" },
                values: new object[,]
                {
                    { 1, 12, null, "P001", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 2, 40, null, "P002", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 3, 25, null, "P003", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 4, 8, null, "P004", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 5, 15, null, "P005", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 6, 30, null, "P006", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 7, 50, null, "P007", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 8, 20, null, "P008", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 9, 0, null, "P009", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 10, 3, null, "P010", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 11, 200, null, "P011", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" },
                    { 12, 100, null, "P012", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Seed" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetails_OrderId",
                table: "OrderDetails",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderDetails_ProductCode",
                table: "OrderDetails",
                column: "ProductCode");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransaction_OrderId",
                table: "StockTransaction",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_StockTransaction_ProductCode",
                table: "StockTransaction",
                column: "ProductCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderDetails");

            migrationBuilder.DropTable(
                name: "Stock");

            migrationBuilder.DropTable(
                name: "StockTransaction");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Product");
        }
    }
}
