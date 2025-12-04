using System;
using API.Entities;
using API.ValueObjects;

namespace API.Interfaces;

public interface INutritionCalculationService
{
    NutritionResult CalculateNutrition(MealFood mealFood);
}
