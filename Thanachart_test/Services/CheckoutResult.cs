using Thanachart_test.Dtos;

namespace Thanachart_test.Services
{
    public enum CheckoutStatus
    {
        Success,
        EmptyCart,
        DuplicateItems,
        InvalidQuantity,
        ProductNotFound,
        InsufficientStock,
    }

    /// <summary>
    /// ผลของการ checkout — ใช้ result object แทนการโยน exception เป็น control flow
    /// เพราะ "ของไม่พอ" เป็นเหตุการณ์ปกติของธุรกิจ ไม่ใช่ข้อผิดพลาดของระบบ
    /// </summary>
    public record CheckoutResult(
        CheckoutStatus Status,
        CheckoutResponse? Response = null,
        string? ErrorMessage = null,
        string? ProductCode = null)
    {
        public bool IsSuccess => Status == CheckoutStatus.Success;

        public static CheckoutResult Success(CheckoutResponse response) =>
            new(CheckoutStatus.Success, response);

        public static CheckoutResult Failure(CheckoutStatus status, string message, string? productCode = null) =>
            new(status, null, message, productCode);
    }
}
