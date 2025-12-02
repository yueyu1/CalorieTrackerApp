using System;

namespace API.Dtos;

public class CreateMealEntryDto
{
    public int FoodId { get; set; }
    public double Quantity { get; set; }
    public required string Unit { get; set; }
}
