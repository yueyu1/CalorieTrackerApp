import { Component, computed, signal } from '@angular/core';
import { Meal, MealType } from '../../types/meal';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../shared/material';

@Component({
  selector: 'app-daily-log',
  imports: [DatePipe, DecimalPipe, MATERIAL_IMPORTS],
  templateUrl: './daily-log.html',
  styleUrl: './daily-log.css',
})
export class DailyLog {
  today = new Date();

  private readonly _meals = signal<Meal[]>([
    {
      mealType: 'Breakfast',
      items: [
        {
          id: 1,
          name: 'Oatmeal',
          brand: 'Quaker',
          calories: 150,
          protein: 6,
          carbs: 27,
          fat: 3,
        },
        {
          id: 2,
          name: 'Banana',
          brand: undefined,
          calories: 100,
          protein: 1,
          carbs: 27,
          fat: 0,
        },
      ],
    },
    {
      mealType: 'Lunch',
      items: [],
    },
    {
      mealType: 'Dinner',
      items: [
        {
          id: 3,
          name: 'Grilled Chicken Breast',
          brand: undefined,
          calories: 250,
          protein: 43,
          carbs: 0,
          fat: 9,
        },
        {
          id: 4,
          name: 'Brown Rice',
          brand: undefined,
          calories: 225,
          protein: 4,
          carbs: 45,
          fat: 6,
        },
      ],
    },
    {
      mealType: 'Snacks',
      items: [],
    },
  ]);

  meals = this._meals.asReadonly();

  private readonly expandedMealTypes = signal<MealType[]>([
    'Breakfast',
  ]);

    // ---- Daily totals ----
  totalCalories = computed(() =>
    this._meals()
      .flatMap((m) => m.items)
      .reduce((sum, i) => sum + i.calories, 0)
  );

  totalProtein = computed(() =>
    this._meals()
      .flatMap((m) => m.items)
      .reduce((sum, i) => sum + i.protein, 0)
  );

  totalCarbs = computed(() =>
    this._meals()
      .flatMap((m) => m.items)
      .reduce((sum, i) => sum + i.carbs, 0)
  );

  totalFat = computed(() =>
    this._meals()
      .flatMap((m) => m.items)
      .reduce((sum, i) => sum + i.fat, 0)
  );

  // ---- Per-meal helpers ----
  getMealTotals(meal: Meal) {
    return meal.items.reduce(
      (acc, i) => ({
        calories: acc.calories + i.calories,
        protein: acc.protein + i.protein,
        carbs: acc.carbs + i.carbs,
        fat: acc.fat + i.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  /** Macro distribution for a meal based on macro calories (P=4, C=4, F=9 kcal) */
  getMealMacroPercents(meal: Meal) {
    const totals = this.getMealTotals(meal);

    const proteinCalories = totals.protein * 4;
    const carbCalories = totals.carbs * 4;
    const fatCalories = totals.fat * 9;

    const macroCalories =
      proteinCalories + carbCalories + fatCalories;

    if (!macroCalories) {
      return null;
    }

    return {
      protein: (proteinCalories / macroCalories) * 100,
      carbs: (carbCalories / macroCalories) * 100,
      fat: (fatCalories / macroCalories) * 100,
    };
  }

  isMealExpanded(meal: Meal): boolean {
    return this.expandedMealTypes().includes(meal.mealType);
  }

  toggleMeal(meal: Meal): void {
    const current = new Set(this.expandedMealTypes());
    if (current.has(meal.mealType)) {
      current.delete(meal.mealType);
    } else {
      current.add(meal.mealType);
    }
    this.expandedMealTypes.set(Array.from(current));
  }

  // ---- Actions ----
  onAddFood(meal: Meal): void {
    // Open your Add Food modal here, passing meal.mealType and date.
    // After saving, reload meals from the API and update _meals.
    console.log('Add food to', meal.mealType);
  }
}
