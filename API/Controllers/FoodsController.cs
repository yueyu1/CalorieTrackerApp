using API.Data;
using API.Dtos;
using API.Entities;
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
        public async Task<ActionResult<IEnumerable<Food>>> GetFoods(
            [FromQuery] string scope = "all",
            [FromQuery] string? q = null
        )
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var foods = _db.Foods.AsQueryable();

            scope = scope.ToLowerInvariant();
            foods = scope switch
            {
                "global" => foods
                    .Where(f => f.UserId == null)
                    .OrderBy(f => f.Name), // global foods alphabetically

                "mine" => foods
                    .Where(f => f.UserId == currentUserId)
                    .OrderByDescending(f => f.CreatedAt), // my foods recent first

                _ => foods // "all"
                    .OrderByDescending(f => f.UserId == currentUserId) // my foods first
                    .ThenByDescending(f => f.CreatedAt) // then my recent foods
                    .ThenBy(f => f.Name) // then global alphabetically
            };

            if (!string.IsNullOrWhiteSpace(q))
            {
                 var qLower = q.ToLowerInvariant().Trim();
                foods = foods
                    .Where(f => 
                        f.Name.ToLower().Contains(qLower)) // filter by query
                    .OrderByDescending(f => 
                        f.Name.ToLower().StartsWith(qLower)) // prioritize starts with
                    .ThenBy(f => 
                        f.Name.ToLower().Contains(qLower)) // then contains
                    .ThenByDescending(f => 
                        f.UserId == currentUserId) // then my foods
                    .ThenBy(f => 
                        f.Name); // then alphabetically
            }

            var result = await foods.ToListAsync();
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Food>> GetFood(int id)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var food = await _db.Foods.FindAsync(id);
            if (food == null)
            {
                return NotFound();
            }

            if (food.UserId != null && food.UserId != currentUserId)
            {
                return Forbid();
            }

            return Ok(food);
        }

        [HttpPost]
        public async Task<ActionResult<Food>> CreateFood(CreateFoodDto foodDto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();
            var food = new Food
            {
                Name = foodDto.Name,
                Brand = foodDto.Brand,
                Calories = foodDto.Calories,
                Carbs = foodDto.Carbs,
                Protein = foodDto.Protein,
                Fat = foodDto.Fat,
                CreatedAt = DateTime.UtcNow,
                UserId = currentUserId
            };

            _db.Foods.Add(food);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetFood), new { id = food.Id }, food);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<Food>> UpdateFood(int id, UpdateFoodDto foodDto)
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var food = await _db.Foods.FindAsync(id);

            if (food == null) return NotFound();

            if (food.UserId != currentUserId) 
                return Forbid(); // can’t edit global or other users' foods

            food.Name = foodDto.Name;
            food.Brand = foodDto.Brand;
            food.Calories = foodDto.Calories;
            food.Carbs = foodDto.Carbs;
            food.Protein = foodDto.Protein;
            food.Fat = foodDto.Fat;
            food.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return NoContent();
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
    }
}
