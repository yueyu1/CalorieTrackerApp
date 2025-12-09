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

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Meal>>> GetMeals(
            [FromQuery] DateOnly? date,
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] MealType? type
        )
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var query = db.Meals
                .Where(m => m.UserId == currentUserId)
                .AsQueryable();

            if (date.HasValue)
            {
                query = query.Where(m => m.MealDate == date.Value);
            }

            if (from.HasValue && to.HasValue)
            {
                query = query.Where(m => m.MealDate >= from.Value && m.MealDate <= to.Value);
            }

            if (type.HasValue)
            {
                query = query.Where(m => m.Type == type.Value);
            }

            var meals = await query
                .Include(m => m.MealFoods)
                    .ThenInclude(mf => mf.Food)
                .OrderBy(m => m.MealDate)
                .ThenBy(m => m.Type)
                .ToListAsync();

            return Ok(meals);
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

            return CreatedAtAction(nameof(GetMeals), new { id = meal.Id }, MapToMealDto(meal));
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
        public async Task<ActionResult<MealFood>> AddMealEntry(int mealId, CreateMealEntryDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var food = await db.Foods.FindAsync(dto.FoodId);
            if (food == null)
            {
                return BadRequest($"Food with ID {dto.FoodId} does not exist.");
            }

            var mealFood = new MealFood
            {
                Quantity = dto.Quantity,
                Unit = dto.Unit,
                MealId = mealId,
                FoodId = dto.FoodId,
                CreatedAt = DateTime.UtcNow
            };

            db.MealFoods.Add(mealFood);
            await db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{mealId}/entries/{foodId}")]
        public async Task<IActionResult> UpdateMealEntry(int mealId, int foodId, UpdateMealEntryDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var mealFood = await db.MealFoods
                .Where(mf => mf.MealId == mealId && mf.FoodId == foodId)
                .FirstOrDefaultAsync();

            if (mealFood == null) return NotFound();

            mealFood.Quantity = dto.Quantity;
            mealFood.Unit = dto.Unit;
            mealFood.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{mealId}/entries/{foodId}")]
        public async Task<IActionResult> DeleteMealEntry(int mealId, int foodId)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var mealFood = await db.MealFoods
                .Where(mf => mf.MealId == mealId && mf.FoodId == foodId)
                .FirstOrDefaultAsync();

            if (mealFood == null) return NotFound();

            db.MealFoods.Remove(mealFood);
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
            var nutrition = nutritionCalculationService.CalculateNutrition(mealFood);

            var food = mealFood.Food; // included via ThenInclude

            return new DailyMealItemDto
            {
                MealId = mealFood.MealId,
                FoodId = mealFood.FoodId,
                Name = food.Name,
                Brand = food.Brand,
                Quantity = mealFood.Quantity,
                Unit = mealFood.Unit,

                Calories = nutrition.Calories,
                Protein = nutrition.Protein,
                Carbs = nutrition.Carbs,
                Fat = nutrition.Fat
            };
        }
    }
}