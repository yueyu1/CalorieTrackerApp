using System;
using API.Enums;

namespace API.Dtos;

public class UpdateMealDto
{
    public MealType Type { get; set; }
    public DateOnly MealDate { get; set; }
    public string? CustomName { get; set; }
}
