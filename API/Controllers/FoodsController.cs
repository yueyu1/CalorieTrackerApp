using API.Data;
using API.Dtos;
using API.Entities;
using API.Enums;
using API.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FoodsController(AppDbContext db) : ControllerBase
    {
        private readonly AppDbContext _db = db;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FoodDto>>> GetFoods([FromQuery] FoodQuery query)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            // TO DO: implement pagination using skip and take
            var take = Math.Clamp(query.Take, 1, FoodQuery.MaxTake);

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
                    .ThenBy(f => f.Name);
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

        [HttpPost("seed")]
        public async Task<ActionResult> SeedFoods()
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var globalFoods = GetSeedFoods();

            var foods = new List<Food>();
            foods.AddRange(globalFoods);

            _db.Foods.AddRange(foods);
            await _db.SaveChangesAsync();

            return Ok(new { Count = foods.Count });
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

        [HttpGet("debug")]
        public async Task<IActionResult> DebugFoodUnits()
        {
            var foods = await _db.Foods
                .Include(f => f.Units)
                .Select(f => new
                {
                    f.Id,
                    f.Name,
                    UnitCount = f.Units.Count,
                    Units = f.Units.Select(u => new { u.Id, u.Code, u.Label, u.FoodId })
                })
                .ToListAsync();

            return Ok(foods);
        }

        private static List<Food> GetSeedFoods()
        {
            return
            [
                new Food
                {
                    Name = "Almonds (raw)",
                    Calories = 579, Protein = 21, Carbs = 22, Fat = 50,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 serving (100 g)", UnitType = UnitType.Weight, ConversionFactor = 100 },
                        new FoodUnit { Code = "g",       Label = "g",                 UnitType = UnitType.Weight, ConversionFactor = 1 },
                        new FoodUnit { Code = "oz",      Label = "oz",                UnitType = UnitType.Weight, ConversionFactor = 28.35 }
                    }
                },
                new Food
                {
                    Name = "Apple",
                    Calories = 52, Protein = 0.3, Carbs = 14, Fat = 0.2,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 medium (182 g)", UnitType = UnitType.Weight, ConversionFactor = 182 },
                        new FoodUnit { Code = "g",       Label = "g",               UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Banana",
                    Calories = 89, Protein = 1.1, Carbs = 23, Fat = 0.3,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 medium (118 g)", UnitType = UnitType.Weight, ConversionFactor = 118 },
                        new FoodUnit { Code = "g",       Label = "g",                UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Broccoli (raw)",
                    Calories = 34, Protein = 2.8, Carbs = 6.6, Fat = 0.4,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (91 g)", UnitType = UnitType.Weight, ConversionFactor = 91 },
                        new FoodUnit { Code = "g",       Label = "g",           UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Chicken Breast (grilled, skinless)",
                    Calories = 165, Protein = 31, Carbs = 0, Fat = 3.6,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 serving (100 g)", UnitType = UnitType.Weight, ConversionFactor = 100 },
                        new FoodUnit { Code = "g",       Label = "g",                 UnitType = UnitType.Weight, ConversionFactor = 1 },
                        new FoodUnit { Code = "oz",      Label = "oz",                UnitType = UnitType.Weight, ConversionFactor = 28.35 }
                    }
                },
                new Food
                {
                    Name = "Egg (whole, cooked)",
                    Calories = 78, Protein = 6, Carbs = 0.6, Fat = 5.3,
                    BaseQuantity = 1, BaseUnit = "piece",
                    Units =
                    {
                        new FoodUnit { Code = "piece", Label = "1 piece",    UnitType = UnitType.Piece, ConversionFactor = 50 },
                        new FoodUnit { Code = "half",  Label = "1/2 piece",  UnitType = UnitType.Piece, ConversionFactor = 25 }
                    }
                },
                new Food
                {
                    Name = "Greek Yogurt (plain, nonfat)",
                    Calories = 59, Protein = 10, Carbs = 3.6, Fat = 0.4,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 container (170 g)", UnitType = UnitType.Weight, ConversionFactor = 170 },
                        new FoodUnit { Code = "g",       Label = "g",                  UnitType = UnitType.Weight, ConversionFactor = 1 },
                        new FoodUnit { Code = "oz",      Label = "oz",                 UnitType = UnitType.Weight, ConversionFactor = 28.35 }
                    }
                },
                new Food
                {
                    Name = "Oatmeal (cooked in water)",
                    Calories = 71, Protein = 2.5, Carbs = 12, Fat = 1.5,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (234 g)", UnitType = UnitType.Weight, ConversionFactor = 234 },
                        new FoodUnit { Code = "g",       Label = "g",            UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Brown Rice (cooked)",
                    Calories = 111, Protein = 2.6, Carbs = 23, Fat = 0.9,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (195 g)", UnitType = UnitType.Weight, ConversionFactor = 195 },
                        new FoodUnit { Code = "g",       Label = "g",            UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "White Rice (cooked)",
                    Calories = 130, Protein = 2.4, Carbs = 28, Fat = 0.3,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (186 g)", UnitType = UnitType.Weight, ConversionFactor = 186 },
                        new FoodUnit { Code = "g",       Label = "g",            UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Salmon (baked)",
                    Calories = 208, Protein = 20, Carbs = 0, Fat = 13,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 fillet (120 g)", UnitType = UnitType.Weight, ConversionFactor = 120 },
                        new FoodUnit { Code = "g",       Label = "g",              UnitType = UnitType.Weight, ConversionFactor = 1 },
                        new FoodUnit { Code = "oz",      Label = "oz",             UnitType = UnitType.Weight, ConversionFactor = 28.35 }
                    }
                },
                new Food
                {
                    Name = "Avocado",
                    Calories = 160, Protein = 2, Carbs = 9, Fat = 15,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1/2 medium (75 g)", UnitType = UnitType.Weight, ConversionFactor = 75 },
                        new FoodUnit { Code = "g",       Label = "g",                UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Peanut Butter",
                    Calories = 588, Protein = 25, Carbs = 20, Fat = 50,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "2 tbsp (32 g)", UnitType = UnitType.Weight, ConversionFactor = 32 },
                        new FoodUnit { Code = "g",       Label = "g",           UnitType = UnitType.Weight, ConversionFactor = 1 },
                        new FoodUnit { Code = "tbsp",    Label = "tbsp",        UnitType = UnitType.Volume, ConversionFactor = 16 }
                    }
                },
                new Food
                {
                    Name = "Olive Oil",
                    Calories = 884, Protein = 0, Carbs = 0, Fat = 100,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 tbsp (14 g)", UnitType = UnitType.Volume, ConversionFactor = 14 },
                        new FoodUnit { Code = "tsp",     Label = "tsp",          UnitType = UnitType.Volume, ConversionFactor = 4.7 },
                        new FoodUnit { Code = "g",       Label = "g",            UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Whole Wheat Bread",
                    Calories = 247, Protein = 13, Carbs = 41, Fat = 4.2,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "slice", Label = "1 slice (28 g)", UnitType = UnitType.Piece,  ConversionFactor = 28 },
                        new FoodUnit { Code = "g",     Label = "g",             UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Orange Juice",
                    Calories = 45, Protein = 0.7, Carbs = 10.4, Fat = 0.2,
                    BaseQuantity = 100, BaseUnit = "ml",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (240 ml)", UnitType = UnitType.Volume, ConversionFactor = 240 },
                        new FoodUnit { Code = "ml",      Label = "ml",            UnitType = UnitType.Volume, ConversionFactor = 1 },
                        new FoodUnit { Code = "fl_oz",   Label = "fl oz",         UnitType = UnitType.Volume, ConversionFactor = 30 }
                    }
                },
                new Food
                {
                    Name = "Milk (2%)",
                    Calories = 50, Protein = 3.3, Carbs = 5, Fat = 2,
                    BaseQuantity = 100, BaseUnit = "ml",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (240 ml)", UnitType = UnitType.Volume, ConversionFactor = 240 },
                        new FoodUnit { Code = "ml",      Label = "ml",            UnitType = UnitType.Volume, ConversionFactor = 1 },
                        new FoodUnit { Code = "fl_oz",   Label = "fl oz",         UnitType = UnitType.Volume, ConversionFactor = 30 }
                    }
                },
                new Food
                {
                    Name = "Spinach (raw)",
                    Calories = 23, Protein = 2.9, Carbs = 3.6, Fat = 0.4,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (30 g)", UnitType = UnitType.Weight, ConversionFactor = 30 },
                        new FoodUnit { Code = "g",       Label = "g",           UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Sweet Potato (baked, no skin)",
                    Calories = 90, Protein = 2, Carbs = 21, Fat = 0.2,
                    BaseQuantity = 100, BaseUnit = "g",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 medium (150 g)", UnitType = UnitType.Weight, ConversionFactor = 150 },
                        new FoodUnit { Code = "g",       Label = "g",               UnitType = UnitType.Weight, ConversionFactor = 1 }
                    }
                },
                new Food
                {
                    Name = "Black Coffee (brewed)",
                    Calories = 2, Protein = 0.1, Carbs = 0, Fat = 0,
                    BaseQuantity = 100, BaseUnit = "ml",
                    Units =
                    {
                        new FoodUnit { Code = "serving", Label = "1 cup (240 ml)", UnitType = UnitType.Volume, ConversionFactor = 240 },
                        new FoodUnit { Code = "ml",      Label = "ml",            UnitType = UnitType.Volume, ConversionFactor = 1 },
                        new FoodUnit { Code = "fl_oz",   Label = "fl oz",         UnitType = UnitType.Volume, ConversionFactor = 30 }
                    }
                }
            ];
        }
    }
}
