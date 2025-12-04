using System;
using API.Entities;
using API.Interfaces;
using API.ValueObjects;

namespace API.Services;

public class NutritionCalculationService : INutritionCalculationService
{
    public NutritionResult CalculateNutrition(MealFood mealFood)
    {
        var food = mealFood.Food ?? throw new ArgumentException("MealFood must have an associated Food entity.");

        double scale = mealFood.Quantity / food.BaseQuantity;
        
        return new NutritionResult
        {
            Calories = (int)Math.Round(food.Calories * scale),
            Protein = food.Protein * scale,
            Carbs = food.Carbs * scale,
            Fat = food.Fat * scale
        };
    }
}