using API.Data;
using API.Dtos;
using API.Entities;
using API.Enums;
using API.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FoodsController(AppDbContext db) : ControllerBase
    {
        private readonly AppDbContext _db = db;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FoodDto>>> GetFoods([FromQuery] FoodQuery query)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var take = Math.Clamp(query.Take, 1, FoodQuery.MaxTake);
            var skip = Math.Max(0, query.Skip);

            var foods = _db.Foods.AsNoTracking().AsQueryable();

            // Apply scope filtering
            foods = query.Scope switch
            {
                FoodScope.Global => foods.Where(f => f.UserId == null),
                FoodScope.Mine => foods.Where(f => f.UserId == currentUserId),
                _ => foods // All
            };

            // Apply brand filtering
            if (query.BrandsOnly)
            {
                foods = foods.Where(f => f.Brand != null && f.Brand.Trim() != "");
            }

            // Apply search filtering
            var q = query.Search?.Trim();
            var hasSearch = !string.IsNullOrWhiteSpace(q);
            if (hasSearch)
            {
                var qLower = q!.ToLowerInvariant();
                foods = foods.Where(f =>
                    f.Name.ToLower().Contains(qLower) ||
                    (f.Brand != null && f.Brand.ToLower().Contains(qLower)));
            }

            // Apply ordering
            IOrderedQueryable<Food> ordered;

            if (hasSearch && query.Sort == FoodSort.Relevance)
            {
                var qLower = q!.ToLowerInvariant();

                // Relevance: starts-with first, then "Mine", then name.
                ordered = foods
                    .OrderByDescending(f => f.Name.StartsWith(q!))
                    .ThenByDescending(f => f.UserId == currentUserId)
                    .ThenBy(f => f.Name)
                    .ThenBy(f => f.Id);
            }

            else
            {
                if (!hasSearch && query.BrandsOnly)
                {
                    ordered = foods
                        .OrderBy(f => f.Brand)
                        .ThenBy(f => f.Name);
                }

                else
                {
                    ordered = query.Scope switch
                    {
                        FoodScope.Global => foods.OrderBy(f => f.Name),
                        FoodScope.Mine => foods
                            .OrderByDescending(f => f.CreatedAt)
                            .ThenBy(f => f.Name),
                        _ => foods
                            .OrderByDescending(f => f.UserId == currentUserId) // Mine first
                            .ThenBy(f => f.CreatedAt) // then newest
                            .ThenBy(f => f.Name)
                    };
                }
            }

            var result = await ordered
                .Skip(skip)
                .Take(take)
                .Select(f => new FoodDto
                {
                    Id = f.Id,
                    Name = f.Name,
                    Brand = f.Brand,
                    Calories = f.Calories,
                    Protein = f.Protein,
                    Carbs = f.Carbs,
                    Fat = f.Fat,
                    BaseQuantity = f.BaseQuantity,
                    BaseUnit = f.BaseUnit,
                    Units = f.Units
                        .OrderBy(u => u.Id)
                        .Select(u => new FoodUnitDto
                        {
                            Id = u.Id,
                            Code = u.Code,
                            Label = u.Label,
                            ConversionFactor = u.ConversionFactor,
                            UnitType = u.UnitType
                        }).ToList(),
                    IsArchived = f.IsArchived,
                    UpdatedAt = f.UpdatedAt
                }).ToListAsync();

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Food>> GetFood(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var food = await _db.Foods.FindAsync(id);
            if (food == null) return NotFound();

            if (food.UserId != null && food.UserId != currentUserId) return Forbid();

            return Ok(food);
        }

        [HttpPost]
        public async Task<ActionResult<FoodDto>> CreateFood(UpsertFoodDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();
            var food = new Food
            {
                Name = dto.Name,
                Brand = dto.Brand,
                Calories = dto.Calories,
                Carbs = dto.Carbs,
                Protein = dto.Protein,
                Fat = dto.Fat,
                CreatedAt = DateTime.UtcNow,
                UserId = currentUserId,
                BaseQuantity = dto.ServingAmount,
                BaseUnit = dto.ServingUnit,
                Units =
                [
                    new()
                    {
                        Code = "serving",
                        Label = $"{dto.ServingDescription} ({dto.ServingAmount} {dto.ServingUnit})",
                        UnitType = UnitType.Custom,
                        ConversionFactor = dto.ServingAmount
                    },
                    new()
                    {
                        Code = dto.ServingUnit,
                        Label = dto.ServingUnit,
                        UnitType = UnitType.Custom,
                        ConversionFactor = 1
                    }
                ]
            };

            _db.Foods.Add(food);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetFood), new { id = food.Id }, MapToFoodDto(food));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<FoodDto>> UpdateFood(int id, UpsertFoodDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var food = await _db.Foods
                .Include(f => f.Units)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (food == null) return NotFound();

            if (food.UserId != currentUserId)
                return Forbid(); // can’t edit global or other users' foods

            food.Name = dto.Name;
            food.Brand = dto.Brand;
            food.Calories = dto.Calories;
            food.Carbs = dto.Carbs;
            food.Protein = dto.Protein;
            food.Fat = dto.Fat;
            food.UpdatedAt = DateTime.UtcNow;
            food.BaseQuantity = dto.ServingAmount;
            food.BaseUnit = dto.ServingUnit;

            var unit = food.Units.FirstOrDefault(u => u.Code == "serving");
            if (unit != null)
            {
                unit.Label = $"{dto.ServingDescription} ({dto.ServingAmount} {dto.ServingUnit})";
                unit.ConversionFactor = dto.ServingAmount;
            }
            else
            {
                food.Units.Add(new FoodUnit
                {
                    Code = "serving",
                    Label = $"{dto.ServingDescription} ({dto.ServingAmount} {dto.ServingUnit})",
                    UnitType = UnitType.Custom,
                    ConversionFactor = dto.ServingAmount
                });
            }

            unit = food.Units.FirstOrDefault(u => u.Code == dto.ServingUnit);
            if (unit != null)
            {
                unit.Label = dto.ServingUnit;
            }
            else
            {
                food.Units.Add(new FoodUnit
                {
                    Code = dto.ServingUnit,
                    Label = dto.ServingUnit,
                    UnitType = UnitType.Custom,
                    ConversionFactor = 1
                });
            }

            await _db.SaveChangesAsync();

            return Ok(MapToFoodDto(food));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFood(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var food = await _db.Foods.FindAsync(id);

            if (food == null) return NotFound();

            if (food.UserId != currentUserId)
                return Forbid(); // can’t delete global or other users' foods

            _db.Foods.Remove(food);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("bulk-delete")]
        public async Task<IActionResult> BulkDeleteFoods([FromBody] List<int> foodIds)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var foods = await _db.Foods
                .Where(f => foodIds.Contains(f.Id))
                .ToListAsync();

            if (foods.Any(f => f.UserId != currentUserId))
                return Forbid(); // can’t delete global or other users' foods

            _db.Foods.RemoveRange(foods);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("{id}/archive")]
        public async Task<IActionResult> ArchiveFood(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var food = await _db.Foods.FindAsync(id);

            if (food == null) return NotFound();

            if (food.UserId != currentUserId)
                return Forbid(); // can’t archive global or other users' foods

            food.IsArchived = true;
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("{id}/restore")]
        public async Task<IActionResult> RestoreFood(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var food = await _db.Foods.FindAsync(id);

            if (food == null) return NotFound();

            if (food.UserId != currentUserId)
                return Forbid(); // can’t restore global or other users' foods

            food.IsArchived = false;
            await _db.SaveChangesAsync();

            return NoContent();
        }

        private static FoodDto MapToFoodDto(Food food) => new()
        {
            Id = food.Id,
            Name = food.Name,
            Brand = food.Brand,
            Calories = food.Calories,
            Protein = food.Protein,
            Carbs = food.Carbs,
            Fat = food.Fat,
            BaseQuantity = food.BaseQuantity,
            BaseUnit = food.BaseUnit,
            IsArchived = food.IsArchived,
            Units = food.Units
                .OrderBy(u => u.Id)
                .Select(u => new FoodUnitDto
                {
                    Id = u.Id,
                    Code = u.Code,
                    Label = u.Label,
                    ConversionFactor = u.ConversionFactor,
                    UnitType = u.UnitType
                }).ToList()
        };
    }
}
