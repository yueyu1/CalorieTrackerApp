namespace API.Dtos;

public class DailyMealItemDto
{
    public int MealId { get; set; }
    public int FoodId { get; set; }

    public string Name { get; set; } = "";
    public string? Brand { get; set; }

    public double Quantity { get; set; }
    public string Unit { get; set; } = "g";

    public int Calories { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }
}
