using System;

namespace API.Dtos;

public class CreateFoodDto
{
    public required string Name { get; set; }
    public string? Brand { get; set; }
    public required string ServingDescription { get; set; }
    public int ServingAmount { get; set; }
    public required string ServingUnit { get; set; }
    public int Calories { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }
}
