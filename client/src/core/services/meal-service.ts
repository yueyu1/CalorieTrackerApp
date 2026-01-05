import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Meal, MealType } from '../../types/meal';
import { Observable } from 'rxjs/internal/Observable';
import { switchMap } from 'rxjs/internal/operators/switchMap';
import { catchError, finalize, tap, throwError } from 'rxjs';
import { MealEntryItem } from '../../types/meal';
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

  /** Load meals (with totals and items) for a specific date */
  loadDailyMeals(date: string): Observable<Meal[]> {
    this.mealsLoading.set(true);
    return this.getDailyMeals(date).pipe(
      tap((meals) => {
        this.meals.set(meals);
      }),
      catchError((error) => {
        return throwError(() => error);
      }),
      finalize(() => {
        this.mealsLoading.set(false);
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
      catchError((error) => {
        return throwError(() => error);
      }),
      finalize(() => {
        this.rangeLoading.set(false);
      })
    ).subscribe();
  }

  /** Get meals for a specific date */
  getDailyMeals(date: string): Observable<Meal[]> {
    return this.http.get<Meal[]>(`${this.apiUrl}/meals/daily`, {
      params: { date },
    });
  }

  /** Create a new meal */
  createMeal(mealType: string, mealDate: string): Observable<Meal> {
    return this.http.post<Meal>(`${this.apiUrl}/meals`, {
      mealType,
      mealDate
    });
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
      switchMap((createdMeal: Meal) => {
        return this.addMealEntriesBulk(createdMeal.id, items).pipe(
          tap((updatedMeal) => {
            // Update the meal in the signal
            this.meals.update(meals =>
              meals.map(m => m.mealType === updatedMeal.mealType && m.mealDate === updatedMeal.mealDate ? updatedMeal : m)
            );
          })
        );
      })
    );
  }

  /** Update a meal entry's quantity and unit */
  updateMealEntryQuantity(mealId: number, entryId: number, quantity: number, unit: string): Observable<Meal> {
    return this.updateMealEntry(mealId, entryId, quantity, unit).pipe(
      tap((updatedMeal) => {
        // Update the meal entry in the signal
        this.meals.update(meals =>
          meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
        );
      })
    );
  }

  /** Delete a food entry from a meal */
  deleteFoodFromMeal(mealId: number, entryId: number): Observable<Meal> {
    return this.deleteMealEntry(mealId, entryId).pipe(
      tap((updatedMeal: Meal) => {
        // Update the meal in the signal
        this.meals.update(meals =>
          meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
        );
      })
    );
  }

  /** Copy entries from one meal to another meal */
  copyEntriesBetweenMeals(sourceMealId: number, targetMeal: Meal, mode: 'append' | 'replace' = 'append'): Observable<Meal> {
    if (targetMeal.id === 0) {
      return this.createMeal(targetMeal.mealType, targetMeal.mealDate).pipe(
        switchMap((createdMeal: Meal) => {
          return this.copyMealEntries(sourceMealId, createdMeal.id, mode).pipe(
            tap((updatedMeal) => {
              // Update the meal in the signal
              this.meals.update(meals =>
                meals.map(m => m.mealType === updatedMeal.mealType && m.mealDate == updatedMeal.mealDate ? updatedMeal : m)
              );
            })
          );
        })
      );
    } else {
      return this.copyMealEntries(sourceMealId, targetMeal.id, mode).pipe(
        tap((updatedMeal) => {
          // Update the meal in the signal
          this.meals.update(meals =>
            meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
          );
        })
      );
    }
  }

  /** Delete a meal entry */
  private deleteMealEntry(mealId: number, entryId: number): Observable<Meal> {
    return this.http.delete<Meal>(`${this.apiUrl}/meals/${mealId}/entries/${entryId}`);
  }

  /** Get meals in a date range */
  private getMealsInRange(from: string, to: string): Observable<DailyTotals[]> {
    return this.http.get<DailyTotals[]>(`${this.apiUrl}/meals/range`, {
      params: { from, to },
    });
  }

  /** Add multiple food entries to a meal in bulk */
  private addMealEntriesBulk(mealId: number, items: MealEntryItem[]): Observable<Meal> {
    return this.http.post<Meal>(`${this.apiUrl}/meals/${mealId}/entries/bulk`, items);
  }

  /** Update a meal entry's quantity and unit */
  private updateMealEntry(mealId: number, entryId: number, quantity: number, unit: string): Observable<Meal> {
    return this.http.put<Meal>(`${this.apiUrl}/meals/${mealId}/entries/${entryId}`, {
      quantity,
      unit: unit
    });
  }

  /** Copy meal entries from one meal to another */
  private copyMealEntries(sourceMealId: number, targetMealId: number, mode: 'append' | 'replace' = 'append'): Observable<Meal> {
    return this.http.post<Meal>(`${this.apiUrl}/meals/${targetMealId}/copy-from/${sourceMealId}`, {});
  }
}
