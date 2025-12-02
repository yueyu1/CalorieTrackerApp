using System;

namespace API.Entities;

public class MealFood
{
    public int MealId { get; set; }
    public Meal Meal { get; set; } = default!;

    public int FoodId { get; set; }
    public Food Food { get; set; } = default!;

    public double Quantity { get; set; }
    public string Unit { get; set; } = "g";
}
