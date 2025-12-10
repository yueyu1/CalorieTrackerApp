using API.Entities;
using API.Interfaces;
using API.ValueObjects;

namespace API.Services;

public class NutritionCalculationService : INutritionCalculationService
{
    public NutritionResult CalculateNutritionForEntry(MealFood entry)
    {
        var food = entry.Food ?? throw new ArgumentException("Food item cannot be null", nameof(entry));
        var unit = food.Units.Single(u => u.Code == entry.Unit);

        var totalBaseAmount = entry.Quantity * unit.ConversionFactor;
        var ratio = totalBaseAmount / food.BaseQuantity;
        
        return new NutritionResult
        {
            Calories = (int)Math.Round(food.Calories * ratio),
            Protein = food.Protein * ratio,
            Carbs = food.Carbs * ratio,
            Fat = food.Fat * ratio
        };
    }
}