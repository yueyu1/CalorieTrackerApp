using System;
using API.Entities;

namespace API.Dtos;

public class FoodDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Brand { get; set; }

    public int Calories { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }
    public double BaseQuantity { get; set; } // e.g. 100
    public required string BaseUnit { get; set; } // "g", "ml", "piece", etc.
    public ICollection<FoodUnitDto> Units { get; set; } = [];

    public bool IsArchived { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
