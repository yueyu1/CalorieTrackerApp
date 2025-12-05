namespace API.Dtos;

public class MealFoodDto
{
    public int FoodId { get; set; }
    public double Quantity { get; set; }
    public string Unit { get; set; } = "g";
}
