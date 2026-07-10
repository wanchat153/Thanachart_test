using Microsoft.AspNetCore.Mvc;
using Thanachart_test.Dtos;
using Thanachart_test.Services;

namespace Thanachart_test.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CheckoutController : ControllerBase
    {
        private readonly ICheckoutService _checkoutService;

        public CheckoutController(ICheckoutService checkoutService)
        {
            _checkoutService = checkoutService;
        }

        /// <summary>ชำระเงิน: สร้างบิล ตัดสต๊อก และบันทึกประวัติการเคลื่อนไหวของสต๊อก</summary>
        [HttpPost(Name = "Checkout")]
        [ProducesResponseType(typeof(CheckoutResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<CheckoutResponse>> Checkout(
            [FromBody] CheckoutRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _checkoutService.CheckoutAsync(request, cancellationToken);

            if (result.IsSuccess)
            {
                return CreatedAtAction(
                    nameof(Checkout),
                    new { orderId = result.Response!.OrderId },
                    result.Response);
            }

            var problem = new ProblemDetails
            {
                Title = result.ErrorMessage,
                Detail = result.ErrorMessage,
                Status = MapStatusCode(result.Status),
            };

            if (result.ProductCode is not null)
            {
                problem.Extensions["productCode"] = result.ProductCode;
            }
            problem.Extensions["reason"] = result.Status.ToString();

            return StatusCode(problem.Status!.Value, problem);
        }

        private static int MapStatusCode(CheckoutStatus status) => status switch
        {
            // ของไม่พอ = ความขัดแย้งกับสถานะปัจจุบันของทรัพยากร ไม่ใช่คำขอผิดรูปแบบ
            CheckoutStatus.InsufficientStock => StatusCodes.Status409Conflict,
            CheckoutStatus.ProductNotFound => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status400BadRequest,
        };
    }
}
