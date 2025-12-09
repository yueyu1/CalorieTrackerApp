import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UnitService } from './unit-service';
import { map, Observable, tap } from 'rxjs';
import { Food, FoodItem } from '../../types/food';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FoodService {
  private http = inject(HttpClient);
  private unitService = inject(UnitService);
  private apiUrl = environment.apiUrl;

  getFoods(): Observable<FoodItem[]> {
    return this.http.get<Food[]>(`${this.apiUrl}/foods`).pipe(
      map(foods => foods.map(f => ({
        id: f.id,
        name: f.name,
        brand: f.brand || '',
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        baseQuantity: f.baseQuantity,
        baseUnit: f.baseUnit,
        units: this.unitService.buildUnitOptions(f),
      })))
    );
  }
}
