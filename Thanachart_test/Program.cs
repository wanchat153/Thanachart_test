using Thanachart_test.Data;
using Thanachart_test.Repositories;
using Thanachart_test.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Connection string ไม่ถูก hardcode: มาจาก appsettings.Development.json (ไม่เข้า VCS)
// หรือ environment variable ConnectionStrings__Default ตอน deploy
var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ไม่พบ connection string 'Default' — ตั้งค่าใน appsettings.Development.json " +
        "หรือ environment variable ConnectionStrings__Default (ดู .env.example)");
}

// การอ่าน/เขียนข้อมูลตอน runtime ใช้ ADO.NET ล้วน (SQL string + parameter)
// EF Core ยังอยู่ในโปรเจคแต่ทำหน้าที่เดียวคือ migrations — ดู Data/ShoppingDbContextFactory.cs
builder.Services.AddSingleton<ISqlConnectionFactory>(
    _ => new SqlConnectionFactory(connectionString));

builder.Services.AddScoped<IProductRepository, ProductRepository>();

// TimeProvider เป็น abstraction ของนาฬิกา — ทำให้เทสต์กำหนดเวลาได้ ไม่ต้องพึ่ง DateTime.UtcNow
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<ICheckoutService, CheckoutService>();

const string FrontendCorsPolicy = "FrontendCorsPolicy";
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:3000" })
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ⚠️ ห้ามเปิด HttpsRedirection ตอน Development
//
// launch profile "https" (ที่ Visual Studio ใช้เป็นค่าเริ่มต้น) เปิดทั้ง :5126 (http) และ :7115 (https)
// พอ middleware นี้ทำงาน ทุก request ที่เข้า :5126 จะถูกตอบ 307 เด้งไป :7115 ซึ่งฆ่า frontend 2 ทาง:
//   1) เบราว์เซอร์ไม่ตาม redirect ของ CORS preflight (OPTIONS) ตามสเปก -> POST /api/checkout ล้มทันที
//   2) fetch ของ Next.js Server Component ตายก่อนถึง controller
// ส่วน `dotnet run` (profile "http") เปิดแค่ :5126 จึงไม่มี https port ให้ redirect -> เลยไม่เจอปัญหา
//
// production ยังบังคับ HTTPS เหมือนเดิม
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);

app.UseAuthorization();

app.MapControllers();

app.Run();
