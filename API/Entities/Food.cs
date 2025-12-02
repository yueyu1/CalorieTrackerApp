using System;
using System.Text.Json.Serialization;

namespace API.Entities;

public class Food
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Brand { get; set; }
    public int Calories { get; set; }
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }

    public string? UserId { get; set; }
    [JsonIgnore]
    public AppUser? User { get; set; }

    [JsonIgnore]
    public ICollection<MealFood> MealFoods { get; set; } = [];
}
