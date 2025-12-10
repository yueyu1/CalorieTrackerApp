using API.Enums;

namespace API.Dtos;

public class FoodUnitDto
{
    public int Id { get; set; }
    public string Code { get; set; } = null!; // "serving", "g", "oz", "fl_oz"
    public string Label { get; set; } = null!; // "1 serving (100 g)", "g", "oz", etc.
    public double ConversionFactor { get; set; }
    public UnitType UnitType { get; set; } // how many grams/ml/pieces this unit represents

}
