using System;
using System.Text.Json.Serialization;
using API.Enums;

namespace API.Entities;

public class FoodUnit
{
    public int Id { get; set; }

    public string Code { get; set; } = null!;   // "serving", "g", "oz", "fl_oz"
    public string Label { get; set; } = null!;  // "1 serving (100 g)", "g",
    
    public double ConversionFactor { get; set; }
    
    public UnitType UnitType { get; set; }

    // Foreign key to Food
    public int FoodId { get; set; }
    [JsonIgnore]
    public Food Food { get; set; } = null!;
}
