import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Meal, MealType } from '../../types/meal';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../shared/material';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-daily-log',
  imports: [CommonModule, DatePipe, DecimalPipe, MATERIAL_IMPORTS],
  templateUrl: './daily-log.html',
  styleUrl: './daily-log.css',
})
export class DailyLog implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private readonly expandedMealTypes = signal<MealType[]>([]);
  protected meals = signal<Meal[]>([]);
  protected today = new Date();

  ngOnInit(): void {
    const date = this.today.toISOString().split('T')[0];

    this.http.get<Meal[]>(`${this.apiUrl}/meals/daily?date=${date}`)
      .subscribe({
        next: (data) => {
          console.log('Loaded daily meals', data);
          this.meals.set(data);
        },
        error: (err) => {
          console.error('Failed to load daily meals', err);
        }
      });
  }

  // ---- Daily totals ----

  totalCalories = computed(() =>
    this.meals().reduce((sum, m) => sum + m.totalCalories, 0)
  );

  totalProtein = computed(() =>
    this.meals().reduce((sum, m) => sum + m.totalProtein, 0)
  );

  totalCarbs = computed(() =>
    this.meals().reduce((sum, m) => sum + m.totalCarbs, 0)
  );

  totalFat = computed(() =>
    this.meals().reduce((sum, m) => sum + m.totalFat, 0)
  );

  // ---- Macro calorie calculations ----
  proteinCalories = computed(() => this.totalProtein() * 4);
  carbsCalories = computed(() => this.totalCarbs() * 4);
  fatCalories = computed(() => this.totalFat() * 9);

  get totalMacroCalories() {
    return this.proteinCalories() +
      this.carbsCalories() +
      this.fatCalories();
  }

  proteinCaloriePercent = computed(() =>
    this.totalMacroCalories > 0
      ? (this.proteinCalories() / this.totalMacroCalories) * 100
      : 0
  );

  carbsCaloriePercent = computed(() =>
    this.totalMacroCalories > 0
      ? (this.carbsCalories() / this.totalMacroCalories) * 100
      : 0
  );

  fatCaloriePercent = computed(() =>
    this.totalMacroCalories > 0
      ? (this.fatCalories() / this.totalMacroCalories) * 100
      : 0
  );

  // ---- Per-meal helpers ----

  /** Macro distribution for a meal based on macro calories (P=4, C=4, F=9 kcal) */
  getMealMacroPercents(meal: Meal) {
    const proteinCalories = meal.totalProtein * 4;
    const carbCalories = meal.totalCarbs * 4;
    const fatCalories = meal.totalFat * 9;

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

  // ---- UI state helpers ----

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
    console.log('Add food to', meal.mealType);
  }
}
