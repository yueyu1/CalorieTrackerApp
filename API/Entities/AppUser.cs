using Microsoft.AspNetCore.Identity;

namespace API.Entities;

public class AppUser : IdentityUser
{
    public required string DisplayName { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    
    public ICollection<Meal> Meals { get; set; } = [];
    public ICollection<Food> Foods { get; set; } = [];
    public UserGoalSettings? GoalSettings { get; set; }
}
