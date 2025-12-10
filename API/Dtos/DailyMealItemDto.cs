using API.Enums;

namespace API.Dtos;

public class DailyMealItemDto
{
    public int MealId { get; set; }
    public int FoodId { get; set; }

    public string Name { get; set; } = "";
    public string? Brand { get; set; }

    public double Quantity { get; set; }
    public string Unit { get; set; } = "g";
    public string? UnitLabel { get; set; }   // "1 serving (100 g)"
    public double ConversionFactor { get; set; } // 100
    public UnitType UnitType { get; set; }       // Weight / Volume / Piece

    public int Calories { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }
}
