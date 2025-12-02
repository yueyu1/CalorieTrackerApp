using API.Enums;

namespace API.Entities;

public class Meal
{
    public int Id { get; set; }
    public MealType Type { get; set; }  
    public string? CustomName { get; set; }
    
    /// <summary>
    /// The user's calendar date for this meal (local date, no time component).
    /// </summary>
    public DateOnly MealDate { get; set; }

    /// <summary>
    /// The UTC timestamp when this meal was created.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; }
    
    public string UserId { get; set; } = default!;
    public AppUser User { get; set; } = default!;

    public ICollection<MealFood> MealFoods { get; set; } = [];
}
