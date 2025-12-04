using System;

namespace API.ValueObjects;

public class NutritionResult
{
    public int Calories { get; init; }
    public double Protein { get; init; }
    public double Carbs { get; init; }
    public double Fat { get; init; }
}
