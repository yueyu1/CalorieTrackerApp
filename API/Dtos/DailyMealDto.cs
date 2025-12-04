using API.Enums;

namespace API.Dtos;

public class DailyMealDto
{
    public int Id { get; set; }
    public MealType MealType { get; set; }
    public string? CustomName { get; set; }
    public DateOnly MealDate { get; set; }

    public List<DailyMealItemDto> Items { get; set; } = [];

    public int TotalCalories { get; set; }
    public double TotalProtein { get; set; }
    public double TotalCarbs { get; set; }
    public double TotalFat { get; set; }
}
