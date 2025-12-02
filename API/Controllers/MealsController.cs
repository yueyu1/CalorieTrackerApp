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
    public class MealsController(AppDbContext db) : ControllerBase
    {
        private readonly AppDbContext _db = db;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Meal>>> GetMeals(
            [FromQuery] DateOnly? date,
            [FromQuery] DateOnly? from,
            [FromQuery] DateOnly? to,
            [FromQuery] MealType? type
        )
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var query = _db.Meals
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

        [HttpGet("{id}")]
        public async Task<ActionResult<Meal>> GetMeal(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await _db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == id)
                .Include(m => m.MealFoods)
                    .ThenInclude(mf => mf.Food)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            return Ok(meal);
        }

        [HttpPost]
        public async Task<ActionResult<Meal>> CreateMeal(CreateMealDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();
            var meal = new Meal
            {
                Type = dto.Type,
                CustomName = dto.CustomName,
                MealDate = dto.MealDate,
                CreatedAtUtc = DateTime.UtcNow,
                UserId = currentUserId
            };

            foreach (var entry in dto.Entries)
            {
                var food = await _db.Foods.FindAsync(entry.FoodId);
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

            _db.Meals.Add(meal);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMeals), new { id = meal.Id }, meal);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Meal>> UpdateMeal(int id, UpdateMealDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await _db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == id)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            meal.MealDate = dto.MealDate;
            meal.Type = dto.Type;
            meal.CustomName = dto.CustomName;

            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMeal(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await _db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == id)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            _db.Meals.Remove(meal);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("{mealId}/entries")]
        public async Task<ActionResult<IEnumerable<MealFood>>> GetMealEntries(int mealId)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await _db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var entries = await _db.MealFoods
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

            var meal = await _db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var food = await _db.Foods.FindAsync(dto.FoodId);
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

            _db.MealFoods.Add(mealFood);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{mealId}/entries/{foodId}")]
        public async Task<IActionResult> UpdateMealEntry(int mealId, int foodId, UpdateMealEntryDto dto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await _db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var mealFood = await _db.MealFoods
                .Where(mf => mf.MealId == mealId && mf.FoodId == foodId)
                .FirstOrDefaultAsync();

            if (mealFood == null) return NotFound();

            mealFood.Quantity = dto.Quantity;
            mealFood.Unit = dto.Unit;
            mealFood.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{mealId}/entries/{foodId}")]
        public async Task<IActionResult> DeleteMealEntry(int mealId, int foodId)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var meal = await _db.Meals
                .Where(m => m.UserId == currentUserId && m.Id == mealId)
                .FirstOrDefaultAsync();

            if (meal == null) return NotFound();

            var mealFood = await _db.MealFoods
                .Where(mf => mf.MealId == mealId && mf.FoodId == foodId)
                .FirstOrDefaultAsync();

            if (mealFood == null) return NotFound();

            _db.MealFoods.Remove(mealFood);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }   
}