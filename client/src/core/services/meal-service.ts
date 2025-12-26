import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Meal, MealItem, MealType } from '../../types/meal';
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
  readonly meals = signal<Meal[]>([]);
  readonly mealsLoading = signal<boolean>(false);
  readonly rangeLoading = signal<boolean>(false);
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
  loadDailyMeals(date: string): Observable<Meal[]> {
    this.mealsLoading.set(true);
    return this.getDailyMeals(date).pipe(
      tap((meals) => {
        this.meals.set(meals);
      }),
      finalize(() => {
        this.mealsLoading.set(false);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /** Load meals totals in a date range */
  loadMealsInRange(from: string, to: string): void {
    this.rangeLoading.set(true);
    this.getMealsInRange(from, to).pipe(
      tap((dts) => {
        this.rangeTotals.set(dts);
      }),
      finalize(() => {
        this.rangeLoading.set(false);
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

  /** Add multiple food entries to a meal in bulk */
  addMealEntriesBulk(mealId: number, items: MealEntryItem[]): Observable<Meal> {
    return this.http.post<Meal>(`${this.apiUrl}/meals/${mealId}/entries/bulk`, items);
  }

  /**
   * Add foods to a meal.
   * If meal.id === 0, creates the meal first, then adds the entry.
   * Otherwise, adds the entry directly to the existing meal.
   */
  addFoodsToMeal(mealId: number, mealType: MealType, mealDate: string, items: MealEntryItem[]): Observable<Meal> {
    // CASE 1: real meal
    if (mealId > 0) {
      return this.addMealEntriesBulk(mealId, items).pipe(
        tap((updatedMeal) => {
          // Update the meal in the signal
          this.meals.update(meals =>
            meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
          );
        })
      );
    }

    // CASE 2: placeholder, must create meal first
    return this.createMeal(mealType, mealDate).pipe(
      tap((createdMeal) => {
        // Update the placeholder meal in the signal
        this.meals.update(meals => 
          meals.map(m => m.id == 0 && m.mealType === createdMeal.mealType ? createdMeal : m)
        );
      }),
      switchMap((createdMeal: Meal) => {
        return this.addMealEntriesBulk(createdMeal.id, items).pipe(
          tap((updatedMeal) => {
            // Update the meal in the signal
            this.meals.update(meals =>
              meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
            );
          })
        );
      })
    );
  }

  deleteFoodFromMeal(mealId: number, entryId: number): Observable<void> {
    return this.deleteMealEntry(mealId, entryId).pipe(
      tap(() => {
        // Update the meal in the signal
        this.meals.update(meals =>
          meals.map(m => {
            if (m.id === mealId) {
              return {
                ...m,
                items: m.items.filter(x => x.id !== entryId)
              };
            }
            return m;
          })
        );
      })
    );
  }

  private deleteMealEntry(mealId: number, entryId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/meals/${mealId}/entries/${entryId}`);
  }

  updateMealEntryQuantity(mealId: number, entryId: number, quantity: number, unit: string): Observable<MealItem> {
    return this.updateMealEntry(mealId, entryId, quantity, unit).pipe(
      tap((updatedMealItem) => {
        // Update the meal entry in the signal
        this.meals.update(meals =>
          meals.map(m => {
            if (m.id === mealId) {
              return {
                ...m,
                items: m.items.map(item => item.id === entryId ? updatedMealItem : item)
              };
            }
            return m;
          })
        );
      })
    );
  }

  private updateMealEntry(mealId: number, entryId: number, quantity: number, unit: string): Observable<MealItem> {
    return this.http.put<MealItem>(`${this.apiUrl}/meals/${mealId}/entries/${entryId}`, {
      quantity,
      unit: unit
    });
  }

  copyMealEntries(sourceMealId: number, targetMealId: number, mode: 'append' | 'replace' = 'append'): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/meals/${targetMealId}/copy-from/${sourceMealId}`, {});
  }
}
