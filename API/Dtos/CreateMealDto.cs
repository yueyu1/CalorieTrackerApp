using System;
using API.Enums;

namespace API.Dtos;

public class CreateMealDto
{
    public MealType Type { get; set; }
    public DateOnly MealDate { get; set; }
    public string? CustomName { get; set; }
    public IEnumerable<CreateMealEntryDto> Entries { get; set; } = [];
}
