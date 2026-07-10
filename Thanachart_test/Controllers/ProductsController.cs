using Microsoft.AspNetCore.Mvc;
using Thanachart_test.Dtos;
using Thanachart_test.Repositories;

namespace Thanachart_test.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _products;
        private readonly ILogger<ProductsController> _logger;

        public ProductsController(IProductRepository products, ILogger<ProductsController> logger)
        {
            _products = products;
            _logger = logger;
        }

        /// <summary>รายการสินค้าทั้งหมดพร้อมยอดคงเหลือในสต๊อก</summary>
        [HttpGet(Name = "GetProducts")]
        [ProducesResponseType(typeof(IEnumerable<ProductDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts(CancellationToken cancellationToken)
        {
            var products = await _products.GetAllAsync(cancellationToken);

            _logger.LogInformation("คืนรายการสินค้า {Count} รายการ", products.Count);

            return Ok(products);
        }
    }
}
