using System;

namespace API.Dtos;

public class UpdateFoodDto
{
    public required string Name { get; set; }
    public string? Brand { get; set; }
    public int Calories { get; set; }
    public int Carbs { get; set; }
    public int Protein { get; set; }
    public int Fat { get; set; }
}
