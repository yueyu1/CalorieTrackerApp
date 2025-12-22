import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Meal, MealType } from '../../types/meal';
import { Observable } from 'rxjs/internal/Observable';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { catchError, finalize, forkJoin, tap, throwError } from 'rxjs';
import { MealEntryItem } from '../../types/meal-entry-item';
import { getPastDays } from '../../shared/utils/date-utils';
import { DailyTotals } from '../../types/progress';

@Injectable({
  providedIn: 'root',
})
export class MealService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  public readonly meals = signal<Meal[]>([]);
  readonly mealsLoading = signal<boolean>(false);
  readonly days = getPastDays(7);
  readonly rangeTotals = signal<DailyTotals[]>([]);

  readonly currentDayTotals = computed(() => {
    return this.meals().reduce(
      (acc, m) => {
        acc.calories += m.totalCalories ?? 0;
        acc.protein += m.totalProtein ?? 0;
        acc.carbs += m.totalCarbs ?? 0;
        acc.fat += m.totalFat ?? 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  });

  /** Load meals (with totals and items) for a specific date */
  loadDailyMeals(date: string): void {
    this.mealsLoading.set(true);
    this.getDailyMeals(date).pipe(
      tap((meals) => {
        this.meals.set(meals);
      }),
      finalize(() => { 
        this.mealsLoading.set(false); 
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    ).subscribe();
  }

  /** Load meals totals in a date range */
  loadMealsInRange(from: string, to: string): void {
    this.mealsLoading.set(true);
    this.getMealsInRange(from, to).pipe(
      tap((dts) => {
        this.rangeTotals.set(dts);
      }),
      finalize(() => { 
        this.mealsLoading.set(false); 
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    ).subscribe();
  }

  /** Get meals for a specific date */
  getDailyMeals(date: string): Observable<Meal[]> {
    return this.http.get<Meal[]>(`${this.apiUrl}/meals/daily`, {
      params: { date },
    });
  }

  /** Get meals in a date range */
  getMealsInRange(from: string, to: string): Observable<DailyTotals[]> {
    return this.http.get<DailyTotals[]>(`${this.apiUrl}/meals/range`, {
      params: { from, to },
    });
  }

  /** Create a new meal */
  createMeal(mealType: string, mealDate: string): Observable<Meal> {
    return this.http.post<Meal>(`${this.apiUrl}/meals`, {
      mealType,
      mealDate
    });
  }

  /** Add a food entry to a meal */
  addMealEntry(mealId: number, foodId: number, quantity: number, unit: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/meals/${mealId}/entries`, {
      foodId,
      quantity,
      unit
    });
  }

  /**
   * Add food to a meal.
   * If meal.id === 0, creates the meal first, then adds the entry.
   * After success, it automatically reloads meals for the last loaded date.
   */
  addFoodToMeal(mealId: number, mealType: MealType, mealDate: string, items: MealEntryItem[]) {
    // CASE 1: real meal
    if (mealId > 0) {
      const entryRequest = items.map((item: MealEntryItem) =>
        this.addMealEntry(mealId, item.foodId, item.quantity, item.unit)
      );
      return forkJoin(entryRequest);
    }

    // CASE 2: placeholder, must create meal first
    return this.createMeal(mealType, mealDate).pipe(
      switchMap((createdMeal: Meal) => {
        this.meals.update(meals => 
          meals.map(m =>
            m.id === 0 && m.mealType === mealType && m.mealDate === mealDate
              ? createdMeal
              : m
          )
        );
        const entryRequest = items.map((item: MealEntryItem) =>
          this.addMealEntry(createdMeal.id, item.foodId, item.quantity, item.unit)
        );
        return forkJoin(entryRequest);
      })
    );
  }

  deleteMealEntry(mealId: number, foodId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/meals/${mealId}/entries/${foodId}`);
  }

  updateMealEntry(mealId: number, entryId: number, quantity: number, unit: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/meals/${mealId}/entries/${entryId}`, {
      quantity,
      unit: unit
    });
  }

  copyMealEntries(sourceMealId: number, targetMealId: number, mode: 'append' | 'replace' = 'append'): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/meals/${targetMealId}/copy-from/${sourceMealId}`, {});
  }
}
