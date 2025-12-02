using System;
using System.Text.Json.Serialization;

namespace API.Entities;

public class MealFood
{
    public double Quantity { get; set; }
    public string Unit { get; set; } = "g";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public int MealId { get; set; }
    [JsonIgnore]
    public Meal Meal { get; set; } = default!;

    public int FoodId { get; set; }
    public Food Food { get; set; } = default!;
}
