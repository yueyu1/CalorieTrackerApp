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

        [HttpPost("seed")]
        public async Task<ActionResult> SeedFoods()
        {
            var currentUserId = HttpContext.GetCurrentUserId();

            var globalFoods = new List<Food>
            {
                new() { Name = "Grilled Chicken Breast", Brand = null, Calories = 165, Protein = 31, Carbs = 0, Fat = 3.6, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "White Rice, Cooked", Brand = null, Calories = 130, Protein = 2.4, Carbs = 28, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Brown Rice, Cooked", Brand = null, Calories = 123, Protein = 2.7, Carbs = 25.6, Fat = 1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Broccoli, Raw", Brand = null, Calories = 34, Protein = 2.8, Carbs = 6.6, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Spinach, Raw", Brand = null, Calories = 23, Protein = 3, Carbs = 3.6, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Banana", Brand = null, Calories = 89, Protein = 1.1, Carbs = 23, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Apple", Brand = null, Calories = 52, Protein = 0.3, Carbs = 14, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Orange", Brand = null, Calories = 47, Protein = 0.9, Carbs = 12, Fat = 0.1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Egg, Whole", Brand = null, Calories = 143, Protein = 12.6, Carbs = 1.1, Fat = 9.5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Egg Whites", Brand = null, Calories = 52, Protein = 11, Carbs = 0.7, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Oatmeal, Dry", Brand = null, Calories = 389, Protein = 17, Carbs = 66, Fat = 7, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Greek Yogurt, Plain", Brand = null, Calories = 59, Protein = 10, Carbs = 3.6, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Cheddar Cheese", Brand = null, Calories = 403, Protein = 25, Carbs = 1.3, Fat = 33, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Milk 2%", Brand = null, Calories = 50, Protein = 3.3, Carbs = 4.8, Fat = 2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Almonds, Raw", Brand = null, Calories = 579, Protein = 21, Carbs = 22, Fat = 50, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Peanuts, Dry Roasted", Brand = null, Calories = 585, Protein = 24, Carbs = 21, Fat = 49, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Peanut Butter", Brand = null, Calories = 588, Protein = 25, Carbs = 20, Fat = 50, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Walnuts", Brand = null, Calories = 654, Protein = 15, Carbs = 14, Fat = 65, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Cashews, Raw", Brand = null, Calories = 553, Protein = 18, Carbs = 30, Fat = 44, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Avocado", Brand = null, Calories = 160, Protein = 2, Carbs = 9, Fat = 15, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new() { Name = "Salmon, Cooked", Brand = null, Calories = 206, Protein = 22, Carbs = 0, Fat = 13, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Tuna, Canned in Water", Brand = null, Calories = 132, Protein = 29, Carbs = 0, Fat = 1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Shrimp, Cooked", Brand = null, Calories = 99, Protein = 24, Carbs = 0, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Cod, Cooked", Brand = null, Calories = 105, Protein = 23, Carbs = 0, Fat = 0.9, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new() { Name = "Beef Steak, Grilled", Brand = null, Calories = 242, Protein = 27, Carbs = 0, Fat = 14, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Ground Beef 90/10", Brand = null, Calories = 217, Protein = 26, Carbs = 0, Fat = 12, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Pork Chop, Cooked", Brand = null, Calories = 231, Protein = 26, Carbs = 0, Fat = 14, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Turkey Breast, Cooked", Brand = null, Calories = 135, Protein = 29, Carbs = 0, Fat = 1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Ham, Sliced", Brand = null, Calories = 145, Protein = 20, Carbs = 1.5, Fat = 6, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new() { Name = "Chicken Thigh, Cooked", Brand = null, Calories = 209, Protein = 26, Carbs = 0, Fat = 10, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Chicken Wings, Fried", Brand = null, Calories = 254, Protein = 22, Carbs = 0, Fat = 18, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Carrots, Raw", Brand = null, Calories = 41, Protein = 0.9, Carbs = 10, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Sweet Potato, Baked", Brand = null, Calories = 90, Protein = 2, Carbs = 21, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Potato, Baked", Brand = null, Calories = 93, Protein = 2.5, Carbs = 21, Fat = 0.1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Corn, Cooked", Brand = null, Calories = 96, Protein = 3.4, Carbs = 21, Fat = 1.5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Green Beans, Cooked", Brand = null, Calories = 35, Protein = 2, Carbs = 7, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new() { Name = "Peas, Cooked", Brand = null, Calories = 84, Protein = 5.4, Carbs = 15, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Zucchini, Raw", Brand = null, Calories = 17, Protein = 1.2, Carbs = 3.1, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Cucumber, Raw", Brand = null, Calories = 15, Protein = 0.7, Carbs = 3.6, Fat = 0.1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Tomato, Raw", Brand = null, Calories = 18, Protein = 0.9, Carbs = 3.9, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Mushrooms, Raw", Brand = null, Calories = 22, Protein = 3.1, Carbs = 3.3, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new() { Name = "Lettuce, Romaine", Brand = null, Calories = 17, Protein = 1.2, Carbs = 3.3, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Onion, Raw", Brand = null, Calories = 40, Protein = 1.1, Carbs = 9.3, Fat = 0.1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Bell Pepper, Red", Brand = null, Calories = 31, Protein = 1, Carbs = 6, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Bell Pepper, Green", Brand = null, Calories = 20, Protein = 1, Carbs = 4.6, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new() { Name = "Pasta, Cooked", Brand = null, Calories = 158, Protein = 5.8, Carbs = 30, Fat = 0.9, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Bread, Whole Wheat", Brand = null, Calories = 247, Protein = 13, Carbs = 41, Fat = 4.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Tortilla, Flour", Brand = null, Calories = 310, Protein = 8, Carbs = 49, Fat = 8, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Tortilla, Corn", Brand = null, Calories = 218, Protein = 5.7, Carbs = 45, Fat = 2.9, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Granola", Brand = null, Calories = 471, Protein = 10, Carbs = 64, Fat = 20, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Cereal, Corn Flakes", Brand = null, Calories = 357, Protein = 8, Carbs = 84, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Honey", Brand = null, Calories = 304, Protein = 0.3, Carbs = 82, Fat = 0, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Sugar, White", Brand = null, Calories = 387, Protein = 0, Carbs = 100, Fat = 0, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Olive Oil", Brand = null, Calories = 884, Protein = 0, Carbs = 0, Fat = 100, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Butter", Brand = null, Calories = 717, Protein = 0.9, Carbs = 0.1, Fat = 81, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Mayonnaise", Brand = null, Calories = 680, Protein = 1, Carbs = 0.6, Fat = 75, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Ketchup", Brand = null, Calories = 112, Protein = 1.3, Carbs = 26, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "BBQ Sauce", Brand = null, Calories = 165, Protein = 0.4, Carbs = 40, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Soy Sauce", Brand = null, Calories = 53, Protein = 8, Carbs = 4.9, Fat = 0.6, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Tofu, Firm", Brand = null, Calories = 144, Protein = 17, Carbs = 3, Fat = 8, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Tempeh", Brand = null, Calories = 195, Protein = 20, Carbs = 9.4, Fat = 11, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Chickpeas, Cooked", Brand = null, Calories = 164, Protein = 9, Carbs = 27, Fat = 2.6, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Black Beans, Cooked", Brand = null, Calories = 132, Protein = 8.9, Carbs = 23.7, Fat = 0.5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Kidney Beans, Cooked", Brand = null, Calories = 127, Protein = 8.7, Carbs = 22.8, Fat = 0.5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Lentils, Cooked", Brand = null, Calories = 116, Protein = 9, Carbs = 20, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Quinoa, Cooked", Brand = null, Calories = 120, Protein = 4.4, Carbs = 21.3, Fat = 1.9, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Barley, Cooked", Brand = null, Calories = 123, Protein = 2.3, Carbs = 28, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Couscous, Cooked", Brand = null, Calories = 112, Protein = 3.8, Carbs = 23, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Hummus", Brand = null, Calories = 166, Protein = 8, Carbs = 14, Fat = 10, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Edamame", Brand = null, Calories = 121, Protein = 11.9, Carbs = 8.9, Fat = 5.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Pumpkin Seeds", Brand = null, Calories = 559, Protein = 30, Carbs = 11, Fat = 49, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Sunflower Seeds", Brand = null, Calories = 584, Protein = 21, Carbs = 20, Fat = 51, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Raisins", Brand = null, Calories = 299, Protein = 3.1, Carbs = 79, Fat = 0.5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Blueberries, Raw", Brand = null, Calories = 57, Protein = 0.7, Carbs = 14, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Strawberries, Raw", Brand = null, Calories = 33, Protein = 0.7, Carbs = 8, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Grapes", Brand = null, Calories = 69, Protein = 0.7, Carbs = 18, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Pineapple", Brand = null, Calories = 50, Protein = 0.5, Carbs = 13, Fat = 0.1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Mango", Brand = null, Calories = 60, Protein = 0.8, Carbs = 15, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Watermelon", Brand = null, Calories = 30, Protein = 0.6, Carbs = 8, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Peach", Brand = null, Calories = 39, Protein = 0.9, Carbs = 10, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Pear", Brand = null, Calories = 57, Protein = 0.4, Carbs = 15, Fat = 0.1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Beef Jerky", Brand = null, Calories = 410, Protein = 33, Carbs = 11, Fat = 27, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Protein Powder, Whey", Brand = null, Calories = 400, Protein = 80, Carbs = 10, Fat = 5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Chicken Noodle Soup", Brand = null, Calories = 40, Protein = 3.3, Carbs = 3.5, Fat = 1.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "French Fries", Brand = null, Calories = 312, Protein = 3.4, Carbs = 41, Fat = 15, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Pizza, Cheese", Brand = null, Calories = 266, Protein = 11, Carbs = 33, Fat = 10, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Hamburger Patty", Brand = null, Calories = 254, Protein = 26, Carbs = 0, Fat = 17, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Hot Dog", Brand = null, Calories = 290, Protein = 10, Carbs = 3, Fat = 26, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Bacon", Brand = null, Calories = 541, Protein = 37, Carbs = 1.4, Fat = 42, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Sausage, Pork", Brand = null, Calories = 301, Protein = 16, Carbs = 2, Fat = 26, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Bagel, Plain", Brand = null, Calories = 250, Protein = 10, Carbs = 48, Fat = 1, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Croissant", Brand = null, Calories = 406, Protein = 8, Carbs = 45, Fat = 21, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Pancakes", Brand = null, Calories = 227, Protein = 6, Carbs = 28, Fat = 10, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new() { Name = "Waffles", Brand = null, Calories = 291, Protein = 7, Carbs = 34, Fat = 14, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
            };

            var brandedFoods = new List<Food>
            {
                new Food { Name = "Chicken Breast", Brand = "Tyson", Calories = 165, Protein = 31, Carbs = 0, Fat = 3.6, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Breaded Chicken Nuggets", Brand = "Tyson", Calories = 296, Protein = 16, Carbs = 18, Fat = 18, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Frozen Beef Patties", Brand = "Great Value", Calories = 250, Protein = 17, Carbs = 0, Fat = 20, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Turkey Bacon", Brand = "Oscar Mayer", Calories = 226, Protein = 20, Carbs = 1, Fat = 16, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Honey Ham", Brand = "Hillshire Farm", Calories = 116, Protein = 17, Carbs = 3, Fat = 3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Rotisserie Chicken", Brand = "Costco Kirkland", Calories = 170, Protein = 24, Carbs = 0, Fat = 7, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Beef Hot Dogs", Brand = "Ball Park", Calories = 289, Protein = 11, Carbs = 3, Fat = 25, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "0% Greek Yogurt", Brand = "Chobani", Calories = 59, Protein = 10, Carbs = 3.6, Fat = 0.4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "2% Greek Yogurt", Brand = "Fage", Calories = 73, Protein = 10, Carbs = 3.9, Fat = 2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Cottage Cheese", Brand = "Good Culture", Calories = 98, Protein = 12, Carbs = 3, Fat = 4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Whole Milk", Brand = "Organic Valley", Calories = 61, Protein = 3.2, Carbs = 4.8, Fat = 3.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "String Cheese", Brand = "Sargento", Calories = 280, Protein = 24, Carbs = 3, Fat = 20, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Sharp Cheddar Cheese", Brand = "Tillamook", Calories = 410, Protein = 24, Carbs = 2, Fat = 34, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Whey Protein Powder", Brand = "Optimum Nutrition", Calories = 400, Protein = 78, Carbs = 10, Fat = 6, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Protein Bar", Brand = "Quest", Calories = 350, Protein = 21, Carbs = 27, Fat = 11, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Protein Shake", Brand = "Fairlife Core Power", Calories = 230, Protein = 26, Carbs = 10, Fat = 7, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Energy Bar", Brand = "Clif Bar", Calories = 420, Protein = 14, Carbs = 65, Fat = 10, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "White Bread", Brand = "Wonder", Calories = 266, Protein = 8, Carbs = 50, Fat = 3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Whole Wheat Bread", Brand = "Dave's Killer Bread", Calories = 260, Protein = 12, Carbs = 47, Fat = 4, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Flour Tortilla", Brand = "Mission", Calories = 310, Protein = 8, Carbs = 49, Fat = 8, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Corn Tortilla", Brand = "Guerrero", Calories = 218, Protein = 5.7, Carbs = 45, Fat = 2.9, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Quick Oats", Brand = "Quaker", Calories = 384, Protein = 13, Carbs = 67, Fat = 6.7, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Granola", Brand = "Nature Valley", Calories = 471, Protein = 10, Carbs = 64, Fat = 20, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Frosted Flakes", Brand = "Kellogg's", Calories = 375, Protein = 5, Carbs = 89, Fat = 0.5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Cheerios", Brand = "General Mills", Calories = 375, Protein = 13, Carbs = 73, Fat = 6.7, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Peanut Butter", Brand = "Skippy", Calories = 588, Protein = 25, Carbs = 20, Fat = 50, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Almond Butter", Brand = "Barney Butter", Calories = 614, Protein = 21, Carbs = 19, Fat = 55, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Nutella", Brand = "Ferrero", Calories = 539, Protein = 6, Carbs = 57, Fat = 31, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Marinara Sauce", Brand = "Rao's", Calories = 60, Protein = 2, Carbs = 5, Fat = 3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "BBQ Sauce", Brand = "Sweet Baby Ray's", Calories = 180, Protein = 0.4, Carbs = 42, Fat = 0.5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Ketchup", Brand = "Heinz", Calories = 112, Protein = 1.3, Carbs = 26, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Mayonnaise", Brand = "Hellmann's", Calories = 720, Protein = 1, Carbs = 1, Fat = 80, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Salsa", Brand = "Pace", Calories = 36, Protein = 1.5, Carbs = 7, Fat = 0.3, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Frozen Pepperoni Pizza", Brand = "DiGiorno", Calories = 260, Protein = 12, Carbs = 28, Fat = 11, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Frozen Cheese Pizza", Brand = "Red Baron", Calories = 265, Protein = 11, Carbs = 33, Fat = 10, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Mac & Cheese", Brand = "Kraft", Calories = 370, Protein = 10, Carbs = 47, Fat = 15, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Chicken Pot Pie", Brand = "Marie Callender's", Calories = 270, Protein = 10, Carbs = 21, Fat = 17, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Chicken Burrito", Brand = "Chipotle", Calories = 185, Protein = 17, Carbs = 20, Fat = 5, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Steak Bowl", Brand = "Chipotle", Calories = 160, Protein = 18, Carbs = 6, Fat = 7, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Chicken Sandwich", Brand = "Chick-fil-A", Calories = 265, Protein = 20, Carbs = 26, Fat = 10, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "French Fries", Brand = "McDonald's", Calories = 312, Protein = 3.4, Carbs = 41, Fat = 15, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Big Mac Patty", Brand = "McDonald's", Calories = 257, Protein = 26, Carbs = 3, Fat = 17, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Pepperoni Pizza Slice", Brand = "Costco Food Court", Calories = 330, Protein = 15, Carbs = 36, Fat = 15, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Hot Dog", Brand = "Costco Food Court", Calories = 290, Protein = 11, Carbs = 2, Fat = 25, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Chocolate Chip Cookies", Brand = "Toll House", Calories = 488, Protein = 4.5, Carbs = 68, Fat = 22, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Ice Cream, Vanilla", Brand = "Ben & Jerry's", Calories = 240, Protein = 4, Carbs = 27, Fat = 12, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Ice Cream, Chocolate", Brand = "Häagen-Dazs", Calories = 270, Protein = 4.5, Carbs = 23, Fat = 17, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },

                new Food { Name = "Orange Juice", Brand = "Tropicana", Calories = 45, Protein = 0.7, Carbs = 10.4, Fat = 0.2, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Cola Soda", Brand = "Coca-Cola", Calories = 42, Protein = 0, Carbs = 11, Fat = 0, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
                new Food { Name = "Potato Chips", Brand = "Lay's Classic", Calories = 536, Protein = 7.2, Carbs = 53, Fat = 34.6, BaseQuantity = 100, BaseUnit = "g", CreatedAt = DateTime.UtcNow, UserId = currentUserId },
            };

            var foods = new List<Food>();
            foods.AddRange(globalFoods);
            foods.AddRange(brandedFoods);

            _db.Foods.AddRange(foods);
            await _db.SaveChangesAsync();

            return Ok(new { Count = foods.Count });
        }

    }
}
