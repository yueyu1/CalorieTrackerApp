using API.Enums;

namespace API.Entities;

public class Meal
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public MealType Type { get; set; }
    public string? CustomName { get; set; }
    
    public string UserId { get; set; } = default!;
    public AppUser User { get; set; } = default!;

    public ICollection<MealFood> MealFoods { get; set; } = [];
}
