using API.Data;
using API.Dtos;
using API.Entities;
using API.Enums;
using API.Extensions;
using API.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MealsController(
        AppDbContext db,
        INutritionCalculationService nutritionCalculationService) : ControllerBase
    {
        private static readonly MealType[] DefaultMealTypes =
        [
            MealType.Breakfast,
            MealType.Lunch,
            MealType.Dinner,
            MealType.Snacks
        ];

        [HttpGet("range")]
        public async Task<ActionResult<IEnumerable<DailyTotalsDto>>> GetMealsRange(
            [FromQuery] DateOnly from,
            [FromQuery] DateOnly to
        )
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            // Filter meals in range for this user
            var meals = await db.Meals
                .Where(m => m.UserId == currentUserId && m.MealDate >= from && m.MealDate <= to)
                .Include(m => m.MealFoods)
                    .ThenInclude(mf => mf.Food)
                .ToListAsync();

            // Flatten to MealFoods while keeping the date
            var entriesWithDate = meals
                .SelectMany(m => m.MealFoods.Select(mf => new
                {
                    MealDate = m.MealDate,
                    MealFood = mf
                }))
                .ToList();

            // Group by date and calculate totals
            var dailyTotals = entriesWithDate
                .GroupBy(e => e.MealDate)
                .Select(g => new DailyTotalsDto
                {
                    Date = g.Key,
                    Calories = g.Sum(e => e.MealFood.Calories),
                    Protein = (int)Math.Round(g.Sum(e => e.MealFood.Protein), MidpointRounding.AwayFromZero),
                    Carbs = (int)Math.Round(g.Sum(e => e.MealFood.Carbs), MidpointRounding.AwayFromZero),
                    Fat = (int)Math.Round(g.Sum(e => e.MealFood.Fat), MidpointRounding.AwayFromZero)
                })
                .OrderBy(dt => dt.Date)
                .ToList();

            // Put DB results into a dictionary for quick lookup by date
            var byDate = dailyTotals.ToDictionary(x => x.Date);

            // Generate every date from 'from' to 'to' and fill missing ones with zeros
            var result = new List<DailyTotalsDto>();
            for (var d = from; d <= to; d = d.AddDays(1))
            {
                if (byDate.TryGetValue(d, out var existing))
                {
                    result.Add(existing);
                }
                else
                {
                    result.Add(new DailyTotalsDto
                    {
                        Date = d,
                        Calories = null,
                        Protein = null,
                        Carbs = null,
                        Fat = null
                    });
                }
            }

            return Ok(result);
        }

        // GET api/meals/daily?date=2025-12-03
        [HttpGet("daily")]
        public async Task<ActionResult<IEnumerable<DailyMealDto>>> GetMealsByDate([FromQuery] DateOnly date)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meals = await db.Meals
                .Where(m => m.UserId == currentUserId && m.MealDate == date)
                .Include(m => m.MealFoods)
                    .ThenInclude(mf => mf.Food)
                        .ThenInclude(f => f.Units)
                .ToListAsync();

            var mealsByType = meals.ToDictionary(m => m.Type);
            var result = new List<DailyMealDto>();

            foreach (var mealType in DefaultMealTypes)
            {
                if (mealsByType.TryGetValue(mealType, out var existing))
                {
                    result.Add(MapMealToDailyDto(existing));
                }
                else
                {
                    result.Add(new DailyMealDto
                    {
                        Id = 0,
                        MealType = mealType,
                        MealDate = date,
                        CustomName = null,
                        Items = [],
                        TotalCalories = 0,
                        TotalProtein = 0,
                        TotalCarbs = 0,
                        TotalFat = 0
                    });
                }
            }

            // Include any custom meal types the user may have created for that date
            result.AddRange(
                meals
                    .Where(m => !DefaultMealTypes.Contains(m.Type))
                    .Select(MapMealToDailyDto)
            );

            return Ok(result.OrderBy(m => m.MealType).ToList());
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Meal>> GetMeal(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == id)
                .Include(m => m.MealFoods)
                    .ThenInclude(mf => mf.Food)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            return Ok(meal);
        }

        [HttpPost]
        public async Task<ActionResult<MealDto>> CreateMeal(CreateMealDto dto)
        {
            if (!Enum.TryParse<MealType>(dto.MealType, ignoreCase: true, out var mealType))
            {
                return BadRequest("Invalid meal type");
            }

            var currentUserId = HttpContext.GetCurrentUserId();
            var meal = new Meal
            {
                Type = mealType,
                CustomName = dto.CustomName,
                MealDate = dto.MealDate,
                CreatedAtUtc = DateTime.UtcNow,
                UserId = currentUserId
            };

            foreach (var entry in dto.Entries)
            {
                var food = await db.Foods.FindAsync(entry.FoodId);
                if (food == null)
                {
                    return BadRequest($"Food with ID {entry.FoodId} does not exist.");
                }

                var mealFood = new MealFood
                {
                    MealId = meal.Id,
                    FoodId = entry.FoodId,
                    Quantity = entry.Quantity,
                    Unit = entry.Unit,
                    CreatedAt = DateTime.UtcNow
                };

                meal.MealFoods.Add(mealFood);
            }

            db.Meals.Add(meal);
            await db.SaveChangesAsync();
            return Ok(MapToMealDto(meal));
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateMeal(int id, UpdateMealDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == id)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            meal.MealDate = dto.MealDate;
            meal.Type = dto.Type;
            meal.CustomName = dto.CustomName;

            await db.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMeal(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == id)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            db.Meals.Remove(meal);
            await db.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("{mealId}/entries")]
        public async Task<ActionResult<IEnumerable<MealFood>>> GetMealEntries(int mealId)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var entries = await db.MealFoods
                .Where(mf => mf.MealId == mealId)
                .Include(mf => mf.Food)
                .OrderBy(mf => mf.CreatedAt)
                    .ThenBy(mf => mf.FoodId)
                .ToListAsync();

            return Ok(entries);
        }

        [HttpPost("{mealId}/entries")]
        public async Task<ActionResult> AddMealEntry(int mealId, CreateMealEntryDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var food = await db.Foods
                .Include(f => f.Units)
                .FirstOrDefaultAsync(f => f.Id == dto.FoodId);
            if (food == null)
                return BadRequest($"Food with ID {dto.FoodId} does not exist.");

            var unit = food.Units.FirstOrDefault(u => u.Code == dto.Unit);
            if (unit == null)
                return BadRequest($"Food with ID {dto.FoodId} does not have unit '{dto.Unit}'.");

            var mealFood = new MealFood
            {
                Quantity = dto.Quantity,
                Unit = unit.Code,
                MealId = mealId,
                FoodId = dto.FoodId,
                Food = food,
                CreatedAt = DateTime.UtcNow
            };

            var n = nutritionCalculationService.CalculateNutritionForEntry(mealFood);

            mealFood.Calories = n.Calories;
            mealFood.Protein = n.Protein;
            mealFood.Carbs = n.Carbs;
            mealFood.Fat = n.Fat;

            db.MealFoods.Add(mealFood);
            await db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{mealId}/entries/{entryId}")]
        public async Task<IActionResult> UpdateMealEntry(int mealId, int entryId, UpdateMealEntryDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var mealFood = await db.MealFoods
                .Where(mf => mf.MealId == mealId && mf.Id == entryId)
                .FirstOrDefaultAsync();

            if (mealFood == null) return NotFound();

            mealFood.Quantity = dto.Quantity;
            mealFood.Unit = dto.Unit;
            mealFood.UpdatedAt = DateTime.UtcNow;

            var n = nutritionCalculationService.CalculateNutritionForEntry(mealFood);

            mealFood.Calories = n.Calories;
            mealFood.Protein = n.Protein;
            mealFood.Carbs = n.Carbs;
            mealFood.Fat = n.Fat;

            await db.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{mealId}/entries/{entryId}")]
        public async Task<IActionResult> DeleteMealEntry(int mealId, int entryId)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var mealFood = await db.MealFoods
                .Where(mf => mf.MealId == mealId && mf.Id == entryId)
                .FirstOrDefaultAsync();

            if (mealFood == null) return NotFound();

            db.MealFoods.Remove(mealFood);
            await db.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Appends all entries from source meal into target meal.
        /// Duplicate foods are allowed.
        /// </summary>
        [HttpPost("{targetMealId}/copy-from/{sourceMealId}")]
        public async Task<IActionResult> CopyMealEntries(int targetMealId, int sourceMealId)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var targetMeal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == targetMealId)
                .FirstOrDefaultAsync();

            if (targetMeal == null) return NotFound();

            var sourceMeal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == sourceMealId)
                    .Include(m => m.MealFoods)
                .FirstOrDefaultAsync();

            if (sourceMeal == null) return NotFound();

            foreach (var entry in sourceMeal.MealFoods)
            {
                var newEntry = new MealFood
                {
                    MealId = targetMealId,
                    FoodId = entry.FoodId,
                    Quantity = entry.Quantity,
                    Unit = entry.Unit,
                    CreatedAt = DateTime.UtcNow
                };

                db.MealFoods.Add(newEntry);
            }

            await db.SaveChangesAsync();

            return NoContent();
        }

        private static MealDto MapToMealDto(Meal meal)
        {
            return new MealDto
            {
                Id = meal.Id,
                MealType = meal.Type,
                CustomName = meal.CustomName,
                MealDate = meal.MealDate,
                Items = [.. meal.MealFoods.Select(mf => new MealFoodDto
                {
                    FoodId = mf.FoodId,
                    Quantity = mf.Quantity,
                    Unit = mf.Unit
                })]
            };
        }

        private DailyMealDto MapMealToDailyDto(Meal meal)
        {
            var items = meal.MealFoods.Select(MapMealFoodToItemDto).ToList();

            return new DailyMealDto
            {
                Id = meal.Id,
                MealType = meal.Type,
                CustomName = meal.CustomName,
                MealDate = meal.MealDate,
                Items = items,
                TotalCalories = items.Sum(i => i.Calories),
                TotalProtein = items.Sum(i => i.Protein),
                TotalCarbs = items.Sum(i => i.Carbs),
                TotalFat = items.Sum(i => i.Fat)
            };
        }

        private DailyMealItemDto MapMealFoodToItemDto(MealFood mealFood)
        {
            var nutrition = nutritionCalculationService.CalculateNutritionForEntry(mealFood);

            var food = mealFood.Food; // included via ThenInclude

            var unit = food.Units.FirstOrDefault(u => u.Code == mealFood.Unit)
                ?? throw new Exception($"Food with ID {food.Id} does not have unit '{mealFood.Unit}'.");

            return new DailyMealItemDto
            {
                Id = mealFood.Id,
                MealId = mealFood.MealId,
                FoodId = mealFood.FoodId,
                Name = food.Name,
                Brand = food.Brand,
                Quantity = mealFood.Quantity,
                Unit = mealFood.Unit,
                UnitLabel = unit.Label,
                ConversionFactor = unit.ConversionFactor,
                UnitType = unit.UnitType,
                Calories = nutrition.Calories,
                Protein = nutrition.Protein,
                Carbs = nutrition.Carbs,
                Fat = nutrition.Fat,
                Units = food.Units.Select(u => new FoodUnitDto
                {
                    Code = u.Code,
                    Label = u.Label,
                    ConversionFactor = u.ConversionFactor,
                    UnitType = u.UnitType
                }).ToList()
            };
        }
    }
}