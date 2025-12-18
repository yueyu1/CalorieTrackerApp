import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Meal, MealItem, MealType } from '../../types/meal';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { AddFoodDialog } from './add-food-dialog/add-food-dialog';
import { MealService } from '../../core/services/meal-service';
import { EditAmountDialog } from './edit-amount-dialog/edit-amount-dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog/confirm-delete-dialog';
import { ToastService } from '../../core/services/toast-service';
import { CustomFoodDialog } from './custom-food-dialog/custom-food-dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CopySourceQuickPick } from '../../types/copy';
import { tap } from 'rxjs';
import { formatQuantity } from '../../shared/formatters/quantity-formatter';
import { CopyFrom } from "./copy-from/copy-from";
import { Router } from '@angular/router';
import { GoalSettingsService } from '../../core/services/goal-settings-service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-daily-log',
  imports: [
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatDividerModule,
    MatIconModule,
    MatDatepickerModule,
    MatTooltipModule,
    CopyFrom
  ],
  templateUrl: './daily-log.html',
  styleUrl: './daily-log.css',
})
export class DailyLog implements OnInit {
  private mealsService = inject(MealService);
  protected goalSettingsService = inject(GoalSettingsService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private expandedMealTypes = signal<MealType[]>([]);
  protected today = new Date().toLocaleDateString('en-CA');
  protected meals = this.mealsService.meals;
  protected yesterdayMeals = signal<Meal[]>([]);
  protected selectedDate = signal<Date>(new Date());
  protected datePickerOpen = signal(false);
  protected formatQuantity = formatQuantity;
  protected pageLoading = computed(() => this.mealsService.mealsLoading()
    || this.goalSettingsService.goalsLoading());
  protected goal = this.goalSettingsService.goalSettings;

  ngOnInit(): void {
    this.loadForDate(this.selectedDate());
    this.goalSettingsService.getSettings().subscribe();
  }

  // ---- Goal targets ----

  protected goalCalories = computed(() => this.goal()?.calories ?? 0);

  protected proteinTarget = computed(() => {
    const g = this.goal();
    if (!g) return 0;

    if (g.macroMode === 'grams') return g.protein;

    return (g.calories * (g.protein / 100)) / 4;
  });

  protected carbsTarget = computed(() => {
    const g = this.goal();
    if (!g) return 0;

    if (g.macroMode === 'grams') return g.carbs;

    return (g.calories * (g.carbs / 100)) / 4;
  });

  protected fatTarget = computed(() => {
    const g = this.goal();
    if (!g) return 0;

    if (g.macroMode === 'grams') return g.fat;

    return (g.calories * (g.fat / 100)) / 9;
  });

  protected caloriesRemaining = computed(() =>
    this.goalCalories() - this.totalCalories()
  );

  protected proteinRemaining = computed(() =>
    this.proteinTarget() - this.totalProtein()
  );

  protected carbsRemaining = computed(() =>
    this.carbsTarget() - this.totalCarbs()
  );

  protected fatRemaining = computed(() =>
    this.fatTarget() - this.totalFat()
  );

  protected caloriesProgress = computed(() =>
    this.goalCalories() > 0
      ? this.totalCalories() / this.goalCalories()
      : 0
  );

  protected proteinProgress = computed(() =>
    this.proteinTarget() > 0
      ? this.totalProtein() / this.proteinTarget()
      : 0
  );

  protected proteinProgressClamped = computed(() =>
    Math.min(1, Math.max(0, this.proteinProgress()))
  );

  protected carbsProgress = computed(() =>
    this.carbsTarget() > 0
      ? this.totalCarbs() / this.carbsTarget()
      : 0
  );

  protected carbsProgressClamped = computed(() =>
    Math.min(1, Math.max(0, this.carbsProgress()))
  );

  protected fatProgress = computed(() =>
    this.fatTarget() > 0
      ? this.totalFat() / this.fatTarget()
      : 0
  );

  protected fatProgressClamped = computed(() =>
    Math.min(1, Math.max(0, this.fatProgress()))
  );

  protected goalChipText = computed(() => {
    const g = this.goal();
    if (!g) return 'No goals set';
    const calories = g.calories.toLocaleString() ?? '-';
    const preset = this.goalPresetName();
    return `Target: ${calories} kcal${preset ? ' · ' + preset : ''}`;
  });

  protected goalTooltip = computed(() => {
    const g = this.goalSettingsService.goalSettings();
    if (!g) return 'Set a calorie target and macro split.';
    if (g.macroMode === 'percent') {
      return `Protein ${g.protein}% · Carbs ${g.carbs}% · Fat ${g.fat}%`;
    }
    return `Protein ${g.protein}g · Carbs ${g.carbs}g · Fat ${g.fat}g`;
  });

  private goalPresetName(): string | null {
    const g = this.goalSettingsService.goalSettings();
    if (!g) return null;

    // Only meaningful when percent mode; otherwise it's “Custom”
    if (g.macroMode !== 'percent') return 'Custom split';

    const p = g.protein, c = g.carbs, f = g.fat;

    // Match your preset patterns (from your Goals page)
    if (p === 30 && c === 40 && f === 30) return 'Maintain';
    if (p === 35 && c === 35 && f === 30) return 'Cut';
    if (p === 30 && c === 45 && f === 25) return 'Bulk';

    return 'Custom';
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

  formatMacroPercent(value: number): string {
    if (value > 0 && value < 1) return '<1%';
    return `${Math.round(value)}%`;
  }

  formatGrams(value: number): string {
    console.log('formatGrams', value);
    if (value > 0 && value < 1) return '<1 g';
    return `${Math.round(value)} g`;
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
      if (!result) return;

      if (result.action === 'createCustomFood') {
        this.openCustomFoodDialog(meal.id, meal.mealType, meal.mealDate);
        return;
      }

      if (!result.items || result.items.length === 0) return;

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
      this.mealsService.updateMealEntry(item.mealId, item.id, quantity, unitCode).pipe(
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

      this.mealsService.deleteMealEntry(meal.id, item.id).pipe(
        tap(() => {
          this.mealsService.loadDailyMeals(meal.mealDate);
          this.toast.success(`${displayName} removed from ${meal.mealType}.`);
        })
      ).subscribe();
    });
  }

  private openCustomFoodDialog(mealId: number, mealType: string, mealDate: string): void {
    const ref = this.dialog.open(CustomFoodDialog, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        mealTypeLabel: mealType,
      }
    });

    ref.afterClosed().subscribe(result => {
      if (!result || result.foodId == null) return;
      this.mealsService.addFoodToMeal(mealId, mealType as MealType, mealDate, [{
        foodId: result.foodId,
        quantity: 1,
        unit: result.unit,
      }]).pipe(
        tap(() => {
          this.mealsService.loadDailyMeals(mealDate);
          this.toast.success(`Custom food added to ${mealType}.`);
        })
      ).subscribe();
    });
  }

  private getMeal(type: MealType): Meal | undefined {
    return this.meals().find(m => m.mealType === type);
  }

  private getYesterdayMeal(type: MealType): Meal | undefined {
    return this.yesterdayMeals().find(m => m.mealType === type);
  }

  private isCopySourceEligible(meal?: Meal): boolean {
    return !!meal && meal.id > 0 && meal.items.length > 0;
  }

  protected breakfastCopyQuickPicks = computed<CopySourceQuickPick[]>(() => {
    const lunch = this.getMeal('Lunch');
    const yesterdayBreakfast = this.getYesterdayMeal('Breakfast');
    return [
      {
        label: 'Today • Lunch',
        sourceMealId: this.isCopySourceEligible(lunch) ? lunch!.id : 0,
        disabled: !this.isCopySourceEligible(lunch)
      },
      {
        label: 'Yesterday • Breakfast',
        sourceMealId: this.isCopySourceEligible(yesterdayBreakfast) ? yesterdayBreakfast!.id : 0,
        disabled: !this.isCopySourceEligible(yesterdayBreakfast)
      },
    ];
  });

  protected lunchCopyQuickPicks = computed<CopySourceQuickPick[]>(() => {
    const breakfast = this.getMeal('Breakfast');
    const yesterdayLunch = this.getYesterdayMeal('Lunch');
    return [
      {
        label: 'Today • Breakfast',
        sourceMealId: this.isCopySourceEligible(breakfast) ? breakfast!.id : 0,
        disabled: !this.isCopySourceEligible(breakfast)
      },
      {
        label: 'Yesterday • Lunch',
        sourceMealId: this.isCopySourceEligible(yesterdayLunch) ? yesterdayLunch!.id : 0,
        disabled: !this.isCopySourceEligible(yesterdayLunch)
      },
    ];
  });

  protected dinnerCopyQuickPicks = computed<CopySourceQuickPick[]>(() => {
    const lunch = this.getMeal('Lunch');
    const breakfast = this.getMeal('Breakfast');
    const yesterdayDinner = this.getYesterdayMeal('Dinner');
    return [
      {
        label: 'Today • Lunch',
        sourceMealId: this.isCopySourceEligible(lunch) ? lunch!.id : 0,
        disabled: !this.isCopySourceEligible(lunch)
      },
      {
        label: 'Today • Breakfast',
        sourceMealId: this.isCopySourceEligible(breakfast) ? breakfast!.id : 0,
        disabled: !this.isCopySourceEligible(breakfast)
      },
      {
        label: 'Yesterday • Dinner',
        sourceMealId: this.isCopySourceEligible(yesterdayDinner) ? yesterdayDinner!.id : 0,
        disabled: !this.isCopySourceEligible(yesterdayDinner)
      },
    ];
  });

  protected snacksCopyQuickPicks = computed<CopySourceQuickPick[]>(() => {
    const lunch = this.getMeal('Lunch');
    const dinner = this.getMeal('Dinner');
    const yesterdaySnacks = this.getYesterdayMeal('Snacks');
    return [
      {
        label: 'Today • Lunch',
        sourceMealId: this.isCopySourceEligible(lunch) ? lunch!.id : 0,
        disabled: !this.isCopySourceEligible(lunch)
      },
      {
        label: 'Today • Dinner',
        sourceMealId: this.isCopySourceEligible(dinner) ? dinner!.id : 0,
        disabled: !this.isCopySourceEligible(dinner)
      },
      {
        label: 'Yesterday • Snacks',
        sourceMealId: this.isCopySourceEligible(yesterdaySnacks) ? yesterdaySnacks!.id : 0,
        disabled: !this.isCopySourceEligible(yesterdaySnacks)
      },
    ];
  });

  copyQuickPicksFor(meal: Meal): CopySourceQuickPick[] {
    switch (meal.mealType) {
      case 'Breakfast':
        return this.breakfastCopyQuickPicks();
      case 'Lunch':
        return this.lunchCopyQuickPicks();
      case 'Dinner':
        return this.dinnerCopyQuickPicks();
      case 'Snacks':
        return this.snacksCopyQuickPicks();
      default:
        return [];
    }
  }

  onCopyRequested(meal: Meal, $event: { sourceMealId: number; mode: "append" | "replace"; }) {
    const { sourceMealId, mode } = $event;
    if (!sourceMealId || sourceMealId <= 0) return;
    if (meal.id <= 0) {
      this.mealsService.createMeal(meal.mealType, meal.mealDate).pipe(
        tap((createdMeal: Meal) => {
          this.copyEntriesToMeal(sourceMealId, createdMeal, mode);
        })).subscribe();
    } else {
      this.copyEntriesToMeal(sourceMealId, meal, mode);
    }
  }

  copyEntriesToMeal(sourceMealId: number, targetMeal: Meal, mode: 'append' | 'replace') {
    this.mealsService.copyMealEntries(sourceMealId, targetMeal.id, mode).pipe(
      tap(() => {
        this.mealsService.loadDailyMeals(targetMeal.mealDate);
        this.toast.success(`Entries copied to ${targetMeal.mealType}.`);
      })
    ).subscribe();
  }

  // ---- Date picker helpers ----

  openDatePicker(picker: MatDatepicker<Date>): void {
    picker.open();
    this.datePickerOpen.set(true);
  }

  onDatePicked(date: Date | null): void {
    if (!date) return;
    this.selectedDate.set(date);
    this.loadForDate(date);
  }

  goToday(): void {
    const d = new Date();
    this.selectedDate.set(d);
    this.loadForDate(d);
  }

  private loadForDate(d: Date): void {
    this.mealsService.loadDailyMeals(this.toYmd(d));

    this.mealsService.getDailyMeals(this.toYmd(this.yesterdayDate())).pipe(
      tap((meals) => {
        this.yesterdayMeals.set(meals);
      })
    ).subscribe();
  }

  private toYmd(d: Date): string {
    // local date -> YYYY-MM-DD (avoids UTC shift issues from toISOString())
    return d.toLocaleDateString('en-CA');
  }

  protected yesterdayDate = computed(() => {
    const d = new Date(this.selectedDate());
    d.setDate(d.getDate() - 1);
    return d;
  });

  protected isToday = computed(() => {
    const today = new Date();
    const selected = this.selectedDate();

    return (
      today.getFullYear() === selected.getFullYear() &&
      today.getMonth() === selected.getMonth() &&
      today.getDate() === selected.getDate()
    );
  });

  protected goToGoals(): void {
    this.router.navigate(['/goal-settings']);
  }
}
