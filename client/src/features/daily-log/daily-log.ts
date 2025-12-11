import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Meal, MealItem, MealType } from '../../types/meal';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MATERIAL_IMPORTS } from '../../shared/material';
import { MatDialog } from '@angular/material/dialog';
import { AddFoodDialog } from './add-food-dialog/add-food-dialog';
import { MealsService } from '../../core/services/meals-service';
import { tap } from 'rxjs';
import { EditAmountDialog } from './edit-amount-dialog/edit-amount-dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog/confirm-delete-dialog';
import { ToastService } from '../../core/services/toast-service';

@Component({
  selector: 'app-daily-log',
  imports: [CommonModule, DatePipe, DecimalPipe, MATERIAL_IMPORTS],
  templateUrl: './daily-log.html',
  styleUrl: './daily-log.css',
})
export class DailyLog implements OnInit {
  private mealsService = inject(MealsService);
  private readonly expandedMealTypes = signal<MealType[]>([]);
  protected today = new Date().toLocaleDateString('en-CA');
  protected meals = this.mealsService.meals;
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);

  // ---- Lifecycle ----

  ngOnInit(): void {
    this.mealsService.loadDailyMeals(this.today);
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

  formatQuantity(item: any): string {
    const qty = item.quantity;               // e.g., 1.5
    const unit = item.unit;                  // e.g., "serving"
    const label = item.unitLabel;            // e.g., "1 serving (100 g)" OR "g"
    const cf = item.conversionFactor;        // e.g., 100, 1, 28.35

    // ---------------------------------------------
    // CASE A: Simple units like "g", "oz", "ml"
    // ---------------------------------------------
    // If label contains no parentheses, it’s a simple unit
    if (!label.includes('(')) {
      // Just scale quantity:
      // 1.5 quantity + "g" label => "1.5 g"
      // 2 quantity + "oz" label => "2 oz"
      return `${qty} ${label}`;
    }

    // ---------------------------------------------
    // CASE B: Serving-based unit like "1 serving (100 g)"
    // ---------------------------------------------
    // Extract the gram part from "(100 g)"
    const match = label.match(/\(([^)]+)\)/);      // extract "100 g"
    const gramsPart = match ? match[1] : null;
    if (!gramsPart) return `${qty} ${unit}`;

    // The number inside "100 g"
    const baseNumberMatch = gramsPart.match(/^\d+(\.\d+)?/);
    const baseNumber = baseNumberMatch ? Number(baseNumberMatch[0]) : cf;

    // Scale it
    const scaled = qty * baseNumber;

    // Extract unit suffix (e.g., "g" from "100 g")
    const unitSuffix = gramsPart.replace(/^\d+(\.\d+)?\s*/, '');

    // Pluralize "serving" -> "servings" when needed
    const pluralUnit = qty === 1 ? unit : `${unit}s`;

    return `${qty} ${pluralUnit}, ${scaled} ${unitSuffix}`;
  }


  // ---- Actions ----
  onAddFood(meal: Meal): void {
    const ref = this.dialog.open(AddFoodDialog, {
      maxWidth: '100vw',
      width: '1100px',
      panelClass: 'add-food-dialog-panel',
      data: {
        mealId: meal.id,
        mealType: meal.mealType,
        mealDate: meal.mealDate,
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result || !result.items?.length) return;

      const { mealId, mealType, mealDate, items } = result;

      this.mealsService.addFoodToMeal(mealId, mealType, mealDate, items).pipe(
        tap(() => {
          this.mealsService.loadDailyMeals(mealDate);
          const count = items.length;
          const message =
            count === 1
              ? `Food added to ${mealType}.`
              : `${count} foods added to ${mealType}.`;

          this.toast.success(message);
        })
      ).subscribe();
    });
  }

  onEditItem(item: MealItem): void {
    const ref = this.dialog.open(EditAmountDialog, {
      width: '640px',
      maxWidth: '90vw',
      data: item,
    }
    );

    ref.afterClosed().subscribe(result => {
      if (!result) return;

      const { quantity, unitCode } = result;
      this.mealsService.updateMealEntry(item.mealId, item.foodId, quantity, unitCode).pipe(
        tap(() => {
          this.mealsService.loadDailyMeals(this.today);
          const displayName = item.brand
            ? `${item.brand} ${item.name}`
            : item.name;

          this.toast.success(
            `Updated amount for ${displayName}.`
          );
        })
      ).subscribe();
    });
  }

  onDeleteItem(meal: Meal, item: MealItem): void {
    const displayName = item.brand ? `${item.brand} ${item.name}` : item.name;
    const ref = this.dialog.open(ConfirmDeleteDialog, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        itemName: displayName,
        mealType: meal.mealType,
      }
    });

    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.mealsService.deleteMealEntry(meal.id, item.foodId).pipe(
        tap(() => {
          this.mealsService.loadDailyMeals(meal.mealDate);
          this.toast.success(`${displayName} removed from ${meal.mealType}.`);
        })
      ).subscribe();
    });
  }
}
