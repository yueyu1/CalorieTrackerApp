using API.Enums;

namespace API.Dtos;

public class MealDto
{
    public int Id { get; set; }
    public MealType MealType { get; set; }
    public string? CustomName { get; set; }
    public DateOnly MealDate { get; set; }
    public List<MealFoodDto> Items { get; set; } = [];
}
