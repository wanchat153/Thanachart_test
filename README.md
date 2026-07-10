# Shopping_test — ระบบสต๊อกสินค้าและตะกร้าสินค้า

ระบบร้านค้าออนไลน์ขนาดเล็ก: แสดงรายการสินค้า ใส่ตะกร้า และชำระเงินพร้อมตัดสต๊อกอย่างถูกต้อง

- **Backend** — ASP.NET Core Web API (.NET 8) + SQL Server · CRUD เขียนเป็น SQL string (ADO.NET)
- **Frontend** — Next.js 16 + TypeScript + Tailwind CSS 4 · ตะกร้าเก็บใน `localStorage`
- **Database** — SQL Server Express (`Shopping_test`) · schema จัดการด้วย EF Core Migrations

---

## สรุปข้อกำหนดทางธุรกิจ (BRD)

> ฉบับเต็มพร้อม traceability matrix (กฎ → ไฟล์โค้ด → เทสต์): **[docs/BRD.md](docs/BRD.md)**
> ฉบับสำหรับผู้ใช้ทั่วไป: เปิดเว็บแล้วไปที่หน้า `/guide`

**ระบบนี้แก้ปัญหาอะไร** — ลูกค้าเลือกสินค้าจากรายการที่มีอยู่จริง เห็นราคาและยอดคงเหลือปัจจุบัน แล้วชำระเงินได้ โดยระบบ **ต้องไม่ขายของเกินจำนวนที่มีอยู่** แม้มีคนกดซื้อพร้อมกัน

**กฎธุรกิจ 12 ข้อ** (บังคับใช้ที่เซิร์ฟเวอร์และฐานข้อมูล ไม่ใช่แค่ซ่อนปุ่มในหน้าเว็บ)

| รหัส | กฎ |
|---|---|
| BR-01 | ราคาและยอดคงเหลืออ่านจากฐานข้อมูลเสมอ — ไม่รับราคาที่เบราว์เซอร์ส่งมา |
| BR-02 | ตะกร้าเก็บแค่รหัสสินค้ากับจำนวน ไม่เก็บราคา |
| BR-03 | เปิดหน้าเมื่อไร ระบบปรับตะกร้าให้ตรงสต๊อกล่าสุดทันที พร้อมแจ้งเหตุผล |
| BR-04 | สั่งซื้อเกินยอดคงเหลือไม่ได้ |
| BR-05 | หนึ่งบิลห้ามมีรหัสสินค้าซ้ำ (HTTP 400) |
| BR-06 | จำนวนสั่งซื้อต้องมากกว่า 0 (HTTP 400) |
| BR-07 | ตัดสต๊อกกับตรวจสอบยอดทำในคำสั่งเดียว — กันการขายเกินเมื่อซื้อพร้อมกัน |
| BR-08 | ของไม่พอแม้รายการเดียว = ยกเลิกทั้งบิล (HTTP 409) ตะกร้าไม่ถูกล้าง |
| BR-09 | บิลบันทึกราคา ณ เวลาที่สั่งซื้อ (snapshot) |
| BR-10 | ทุกการตัดสต๊อกถูกบันทึกลง `StockTransaction` |
| BR-11 | บิลที่สร้างมีสถานะ `Paid` เสมอ |
| BR-12 | ค้นหาจากชื่อก่อนรหัสเสมอ — พิมพ์ 1 ตัวอักษรก็ค้นทันที |

**ขอบเขต** — ✅ ดูสินค้า · ค้นหาแบบ autocomplete · ตะกร้า · ชำระเงินพร้อมตัดสต๊อกในธุรกรรมเดียว · โหมดสว่าง/มืด
**ยังไม่มีในเฟสนี้** — ❌ ระบบสมาชิก · หน้า admin · ประวัติคำสั่งซื้อ · ยกเลิก/คืนเงิน · payment gateway

---

## สิ่งที่ต้องมีในเครื่อง

| เครื่องมือ | เวอร์ชันที่ทดสอบแล้ว | ใช้ทำอะไร |
|---|---|---|
| .NET SDK | **8.0.303** | build/run backend (โปรเจค target `net8.0`) |
| Node.js | **24.17.0** | build/run frontend |
| SQL Server | **2022 Express** | ฐานข้อมูล |
| `sqlcmd` | มากับ SQL Server Client SDK | ตรวจข้อมูลในฐานข้อมูล |

---

## เริ่มใช้งานตั้งแต่ศูนย์

### 1. ตั้ง connection string

Backend อ่าน connection string จาก [`Thanachart_test/appsettings.Development.json`](Thanachart_test/appsettings.Development.json)

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost\\SQLEXPRESS;Database=Shopping_test;User Id=<user>;Password=<password>;TrustServerCertificate=True;MultipleActiveResultSets=True"
  }
}
```

> ⚠️ **`User Id=` ไม่ใช่ `ID=`** — SQL Server ไม่รู้จัก keyword `ID` และจะฟ้อง error ที่อ่านไม่รู้เรื่อง
> ⚠️ localhost/SQLEXPRESS ต้องมี `TrustServerCertificate=True` ไม่งั้นเชื่อมต่อไม่ได้

บัญชีที่ใช้ต้องมีสิทธิ์ `dbcreator` (หรือ `sysadmin`) เพราะ migration เป็นคนสร้างฐานข้อมูลให้

### 2. สร้างฐานข้อมูล + ใส่ข้อมูลตัวอย่าง

รันจาก root ของโปรเจค:

```bash
dotnet tool restore                                   # ติดตั้ง dotnet-ef 8.0.28 ที่ pin ไว้
dotnet ef database update --project Thanachart_test
```

คำสั่งนี้จะสร้างฐานข้อมูล `Shopping_test` ตาราง 5 ตัว และ seed สินค้า 12 รายการให้อัตโนมัติ
(**ไม่มีหน้าจัดการนำเข้าข้อมูล** — ข้อมูลตัวอย่างฝังอยู่ใน migration)

ตรวจว่าสำเร็จ:
```bash
sqlcmd -S "localhost\SQLEXPRESS" -U <user> -P <password> -d Shopping_test -I -Q "SELECT COUNT(*) FROM Product;"
```
> `-I` (QUOTED_IDENTIFIER ON) **จำเป็น** — ตาราง `OrderDetails` มี persisted computed column
> ถ้าไม่ใส่ คำสั่ง `DELETE`/`UPDATE` จะล้มด้วย `Msg 1934`

### 3. รัน backend

รันได้ **ทั้งสองทาง** ผลลัพธ์ใช้งานได้เหมือนกัน:

| วิธี | launch profile | port ที่เปิด |
|---|---|---|
| `dotnet run --project Thanachart_test/Thanachart_test.csproj` | `http` (ตัวแรกใน launchSettings) | `http://localhost:5126` |
| กด **Run/F5 ใน Visual Studio** | `https` (ตาม `ActiveDebugProfile`) | `https://localhost:7115` **+** `http://localhost:5126` |

- API: <http://localhost:5126> · Swagger UI: <http://localhost:5126/swagger> (เฉพาะ `ASPNETCORE_ENVIRONMENT=Development`)
- Frontend คุยกับ `http://localhost:5126` เสมอ จึงใช้ได้กับทั้งสองวิธี

### 4. รัน frontend

```bash
cd frontend
cp .env.example .env.local     # ตั้ง NEXT_PUBLIC_API_BASE_URL ให้ชี้ backend
npm install
npm run dev
```
เปิด <http://localhost:3000>

> Backend เปิด CORS ให้ `http://localhost:3000` เท่านั้น (ตั้งใน `appsettings.json` → `Cors:AllowedOrigins`)
> ถ้ารัน frontend คนละพอร์ต ต้องเพิ่ม origin ที่นั่นด้วย

---

## คำสั่งตรวจงาน (รันก่อนบอกว่าเสร็จเสมอ)

### Backend
```bash
dotnet build Thanachart_test.sln -c Release
dotnet format Thanachart_test.sln --verify-no-changes
dotnet test Thanachart_test.sln -c Release
```

> ⚠️ `dotnet test` ต่อ **SQL Server จริง** และสร้าง/ลบฐานข้อมูล `Shopping_test_xunit` ทุกครั้ง

### Frontend
```bash
cd frontend
npm test              # Vitest — logic ของตะกร้า
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # next build
```

---

## API

| Method | Path | คำอธิบาย |
|---|---|---|
| `GET` | `/api/products` | สินค้าทั้งหมด + ยอดคงเหลือ (`Product LEFT JOIN Stock`) |
| `POST` | `/api/checkout` | ชำระเงิน: สร้างบิล + ตัดสต๊อก + บันทึกประวัติสต๊อก |

### `POST /api/checkout`

```jsonc
// request — ส่งแค่ code กับ quantity
{ "items": [{ "code": "P001", "quantity": 2 }] }
```

**ราคาอ่านจากฐานข้อมูลเสมอ** — ถ้า client แนบราคามาด้วยจะถูกเมิน ป้องกันการแก้ราคาฝั่งผู้ใช้

| สถานะ | ความหมาย |
|---|---|
| `201` | สำเร็จ — คืน `orderId`, `totalAmount`, รายการพร้อม `subTotal` |
| `400` | ตะกร้าว่าง / จำนวนไม่เป็นบวก / รหัสสินค้าซ้ำ |
| `404` | ไม่พบรหัสสินค้า |
| `409` | สต๊อกไม่พอ (มีคนซื้อตัดหน้า) — **ยกเลิกทั้งบิล ไม่ขายบางส่วน** |

---

## หลักการสำคัญของระบบนี้

1. **ตัดสต๊อกตอน checkout เท่านั้น** — ตะกร้าอยู่ใน `localStorage` ของเบราว์เซอร์ การตัดสต๊อกตอนใส่ตะกร้าจะทำให้สต๊อกรั่วถาวรเมื่อผู้ใช้ปิดแท็บทิ้ง

2. **กันขายเกินด้วยคำสั่งเดียว** — เช็คและหักพร้อมกัน ไม่มีช่องว่างให้ race condition:
   ```sql
   UPDATE dbo.Stock SET StockQuantity = StockQuantity - @Quantity
   WHERE Code = @Code AND StockQuantity >= @Quantity;
   -- rowcount = 0 -> ของไม่พอ -> rollback ทั้งบิล ตอบ 409
   ```

3. **ข้อมูลทุกอย่างมาจากฐานข้อมูล** — ไม่มีรายการสินค้า ราคา หรือสต๊อก hardcode ไว้ในฝั่ง frontend

4. **`SubTotal` คำนวณโดย SQL Server** — เป็น computed column `(Quantity * UnitPrice) PERSISTED` แอปเขียนค่าเองไม่ได้ จึงเพี้ยนไม่ได้

5. **SQL ทุกคำสั่งใช้ parameter** — ไม่มีการต่อสตริงกับค่าจากผู้ใช้ (กัน SQL injection)

6. **เงินเป็น `decimal(18,2)`** ทั้ง C# และ SQL Server — ไม่ใช้ `float`/`double`

---

## เอกสารเพิ่มเติม

- [docs/BRD.md](docs/BRD.md) — ข้อกำหนดทางธุรกิจฉบับเต็ม (กฎธุรกิจ · FR · traceability matrix)

---

## ยังไม่มีในเฟสนี้

ระบบ auth/login · หน้า admin
