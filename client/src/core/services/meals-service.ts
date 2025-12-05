import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Meal } from '../../types/meal';
import { Observable } from 'rxjs/internal/Observable';
import { switchMap } from 'rxjs/internal/operators/switchMap';

@Injectable({
  providedIn: 'root',
})
export class MealsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  public readonly meals = signal<Meal[]>([]);

  /** Load meals (with totals and items) for a specific date */
  loadDailyMeals(date: string): void {
    this.getDailyMeals(date).subscribe({
      next: (data) => {
        this.meals.set(data);
      },
      error: (err) => {
        console.error('Failed to load daily meals', err);
        this.meals.set([]);
      }
    });
  }

  getDailyMeals(date: string): Observable<Meal[]> {
    return this.http.get<Meal[]>(`${this.apiUrl}/meals/daily`, {
      params: { date },
    });
  }

  /**
   * Add food to a meal.
   * If meal.id === 0, creates the meal first, then adds the entry.
   * After success, it automatically reloads meals for the last loaded date.
   */
  addFoodToMeal(meal: Meal, foodId: number, quantity: number, unit: string) {
    // CASE 1: real meal
    if (meal.id > 0) {
      return this.http.post(`${this.apiUrl}/meals/${meal.id}/entries`, {
        foodId,
        quantity,
        unit
      });
    }

    // CASE 2: placeholder, must create meal first
    return this.http.post<Meal>(`${this.apiUrl}/meals`, {
      mealType: meal.mealType,
      mealDate: meal.mealDate
    })
      .pipe(
        switchMap((createdMeal) =>
          this.http.post(`${this.apiUrl}/meals/${createdMeal.id}/entries`, {
            foodId,
            quantity,
            unit
          }))
      );
  }
}
