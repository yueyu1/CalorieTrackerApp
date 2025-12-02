using System;

namespace API.Dtos;

public class UpdateMealEntryDto
{
    public double Quantity { get; set; }
    public required string Unit { get; set; }
}
