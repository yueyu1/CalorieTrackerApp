import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Meal, MealItem, MealType } from '../../types/meal';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { AddFoodDialog } from './add-food-dialog/add-food-dialog';
import { MealService } from '../../core/services/meal-service';
import { EditAmountDialog } from './edit-amount-dialog/edit-amount-dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog/confirm-delete-dialog';
import { ToastService } from '../../core/services/toast-service';
import { CustomFoodDialog } from '../my-foods/dialogs/custom-food-dialog/custom-food-dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CopySourceQuickPick } from '../../types/copy';
import { finalize, tap } from 'rxjs';
import { formatQuantity } from '../../shared/formatters/quantity-formatter';
import { CopyFrom } from "./copy-from/copy-from";
import { Router } from '@angular/router';
import { GoalSettingsService } from '../../core/services/goal-settings-service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toYmd } from '../../shared/utils/date-utils';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    MatProgressSpinnerModule,
    CopyFrom
  ],
  templateUrl: './daily-log.html',
  styleUrl: './daily-log.css',
})
export class DailyLog implements OnInit {
  private mealService = inject(MealService);
  protected goalSettingsService = inject(GoalSettingsService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private distroyRef = inject(DestroyRef);
  private expandedMealTypes = signal<MealType[]>([]);
  protected meals = this.mealService.meals;
  protected yesterdayMeals = signal<Meal[]>([]);
  protected selectedDate = signal<Date>(new Date());
  protected datePickerOpen = signal(false);
  protected formatQuantity = formatQuantity;
  protected pageLoading = computed(() => this.mealService.mealsLoading()
    || this.goalSettingsService.isLoading());
  protected goal = this.goalSettingsService.goalSettings;
  protected currentDayTotals = this.mealService.currentDayTotals;
  protected goalCalories = this.goalSettingsService.targetCalories;
  protected deletingIds = signal<Set<number>>(new Set());
  private busyByMealKey = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.loadForDate(this.selectedDate());
    this.goalSettingsService.loadGoalSettings().subscribe();
  }

  protected caloriesRemaining = computed(() =>
    this.goalCalories() - this.currentDayTotals().calories
  );

  protected proteinRemaining = computed(() =>
    this.goalSettingsService.macroTargets().protein - this.currentDayTotals().protein
  );

  protected carbsRemaining = computed(() =>
    this.goalSettingsService.macroTargets().carbs - this.currentDayTotals().carbs
  );

  protected fatRemaining = computed(() =>
    this.goalSettingsService.macroTargets().fat - this.currentDayTotals().fat
  );

  protected caloriesProgress = computed(() =>
    this.goalCalories() > 0
      ? this.currentDayTotals().calories / this.goalCalories()
      : 0
  );

  protected proteinProgress = computed(() =>
    this.goalSettingsService.macroTargets().protein > 0
      ? this.currentDayTotals().protein / this.goalSettingsService.macroTargets().protein
      : 0
  );

  protected proteinProgressClamped = computed(() =>
    Math.min(1, Math.max(0, this.proteinProgress()))
  );

  protected carbsProgress = computed(() =>
    this.goalSettingsService.macroTargets().carbs > 0
      ? this.currentDayTotals().carbs / this.goalSettingsService.macroTargets().carbs
      : 0
  );

  protected carbsProgressClamped = computed(() =>
    Math.min(1, Math.max(0, this.carbsProgress()))
  );

  protected fatProgress = computed(() =>
    this.goalSettingsService.macroTargets().fat > 0
      ? this.currentDayTotals().fat / this.goalSettingsService.macroTargets().fat
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

  // ---- Macro calorie calculations ----
  proteinCalories = computed(() => this.currentDayTotals().protein * 4);
  carbsCalories = computed(() => this.currentDayTotals().carbs * 4);
  fatCalories = computed(() => this.currentDayTotals().fat * 9);

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

  showMacroPercent = computed(() =>
    this.goalSettingsService.goalSettings() === null ||
    this.goalSettingsService.goalSettings()?.showMacroPercent === true
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

      if (!result) return;

      const count = result.count;
      const message = count === 1
        ? `Food added to ${meal.mealType}.`
        : `${count} foods added to ${meal.mealType}.`;
      this.toast.success(message);
    });
  }

  onEditItem(item: MealItem): void {
    const ref = this.dialog.open(EditAmountDialog, {
      width: '640px',
      maxWidth: '90vw',
      data: item,
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const displayName = item.brand
        ? `${item.brand} ${item.name}`
        : item.name;
      this.toast.success(`Updated amount for ${displayName}.`);
    });
  }

  onDeleteItem(meal: Meal, item: MealItem): void {
    const displayName = item.brand ? `${item.brand} ${item.name}` : item.name;

    if (this.goalSettingsService.goalSettings()?.confirmDeleteFood === false) {
      this.setDeleting(item.id, true);

      this.mealService.deleteFoodFromMeal(meal.id, item.id).pipe(
        takeUntilDestroyed(this.distroyRef),
        finalize(() => this.setDeleting(item.id, false))
      ).subscribe({
        next: () => {
          this.toast.success(`${displayName} deleted from ${meal.mealType}.`);
        },
        error: (err) => {
          console.error('Error deleting meal item:', err);
          this.toast.error(`Failed to delete ${displayName}. Please try again.`);
        }
      });

      return;
    }

    const ref = this.dialog.open(ConfirmDeleteDialog, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        mealId: meal.id,
        entryId: item.id,
        itemName: displayName,
        mealType: meal.mealType,
      }
    });

    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.toast.success(`${displayName} deleted from ${meal.mealType}.`);
    });
  }

  private openCustomFoodDialog(mealId: number, mealType: string, mealDate: string): void {
    const ref = this.dialog.open(CustomFoodDialog, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        mealId,
        mealTypeLabel: mealType,
        mealDate,
      }
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.toast.success(`Custom food added to ${mealType}.`);
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

  private setDeleting(id: number, on: boolean) {
    const next = new Set(this.deletingIds());
    on ? next.add(id) : next.delete(id);
    this.deletingIds.set(next);
  }

  protected isDeleting(id: number): boolean {
    return this.deletingIds().has(id);
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

  private mealKey(meal: Meal): string {
    return meal.id > 0 ? `id:${meal.id}` : `type:${meal.mealType}`;
  }

  setMealBusy(meal: Meal, busy: boolean): void {
    const key = this.mealKey(meal);
    this.busyByMealKey.update(map => ({ ...map, [key]: busy }));
  }

  isMealBusy(meal: Meal): boolean {
    return !!this.busyByMealKey()[this.mealKey(meal)];
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
    this.mealService.loadDailyMeals(toYmd(d)).subscribe();

    this.mealService.getDailyMeals(toYmd(this.yesterdayDate())).pipe(
      tap((meals) => {
        this.yesterdayMeals.set(meals);
      })
    ).subscribe();
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
