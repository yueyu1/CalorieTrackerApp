using System;
using API.Enums;

namespace API.Dtos;

public class CreateMealDto
{
    public required string MealType { get; set; }
    public DateOnly MealDate { get; set; }
    public string? CustomName { get; set; }
    public IEnumerable<CreateMealEntryDto> Entries { get; set; } = [];
}
