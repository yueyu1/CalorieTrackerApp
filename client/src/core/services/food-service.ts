import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';
import { Food } from '../../types/food';
import { environment } from '../../environments/environment';
import { UpsertCustomFoodRequest } from '../../types/custom-food';

export type FoodQuery = {
  scope?: 'all' | 'global' | 'mine';
  search?: string;
  sort?: string;
  take?: number;
  brandsOnly?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class FoodService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  readonly foods = signal<Food[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingIds = signal<Set<number>>(new Set());

  getFoods(query: FoodQuery): Observable<Food[]> {
    let params = new HttpParams();

    if (query.scope) params = params.set('scope', query.scope);   // all|global|mine
    if (query.search) params = params.set('search', query.search);
    if (query.sort) params = params.set('sort', query.sort);      // relevance|recentCreated|recentUsed...
    if (query.take) params = params.set('take', query.take);
    if (query.brandsOnly) params = params.set('brandsOnly', 'true');

    return this.http.get<Food[]>(`${this.apiUrl}/foods`, { params });
  }

  loadFoods(query: FoodQuery): void {
    this.loading.set(true);

    this.getFoods(query).pipe(
      tap((foods: Food[]) => {
        this.foods.set(foods);
      }),
      finalize(() => {
        this.loading.set(false);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    ).subscribe();
  }

  createCustomFood(payload: UpsertCustomFoodRequest): Observable<Food> {
    this.saving.set(true);
    return this.http.post<Food>(`${this.apiUrl}/foods`, payload).pipe(
      tap((newFood: Food) => {
        this.foods.update((foods) => [newFood, ...foods]);
      }),
      finalize(() => {
        this.saving.set(false);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  editCustomFood(foodId: number, payload: UpsertCustomFoodRequest): Observable<Food> {
    this.saving.set(true);
    return this.http.put<Food>(`${this.apiUrl}/foods/${foodId}`, payload).pipe(
      tap((updatedFood: Food) => {
        this.foods.update((foods) => foods.map((food) =>
          food.id === foodId ? updatedFood : food
        ));
      }),
      finalize(() => {
        this.saving.set(false);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  deleteCustomFood(foodId: number): Observable<void> {
    this.deletingIds.update((set) => new Set(set).add(foodId));

    return this.http.delete<void>(`${this.apiUrl}/foods/${foodId}`).pipe(
      tap(() => {
        this.foods.update((foods) => foods.filter((food) => food.id !== foodId));
      }),
      finalize(() => {
        const deletingSet = new Set(this.deletingIds());
        deletingSet.delete(foodId);
        this.deletingIds.set(deletingSet);
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  deleteCustomFoodsBulk(foodIds: number[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/foods/bulk-delete`, foodIds).pipe(
      tap(() => {
        this.foods.update((foods) => foods.filter((food) => !foodIds.includes(food.id)));
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  archiveCustomFood(foodId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/foods/${foodId}/archive`, {}).pipe(
      tap(() => {
        this.foods.update((foods) => foods.map((food) =>
          food.id === foodId ? { ...food, isArchived: true } : food
        ));
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  restoreCustomFood(foodId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/foods/${foodId}/restore`, {}).pipe(
      tap(() => {
        this.foods.update((foods) => foods.map((food) =>
          food.id === foodId ? { ...food, isArchived: false } : food
        ));
      }),
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}