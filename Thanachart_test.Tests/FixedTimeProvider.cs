namespace Thanachart_test.Tests
{
    /// <summary>นาฬิกาที่หยุดนิ่ง ทำให้ยืนยันค่า OrderDate/TransactionDate ได้แน่นอน</summary>
    public sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FixedTimeProvider(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }
}
