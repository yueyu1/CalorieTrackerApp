using API.Entities;
using API.ValueObjects;

namespace API.Interfaces;

public interface INutritionCalculationService
{
    NutritionResult CalculateNutritionForEntry(MealFood mealFood);
}
