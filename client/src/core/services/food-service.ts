import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UnitService } from './unit-service';
import { Observable } from 'rxjs';
import { Food } from '../../types/food';
import { environment } from '../../environments/environment';
import { CreateCustomFoodRequest } from '../../types/custom-food';

@Injectable({
  providedIn: 'root',
})
export class FoodService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getFoods(): Observable<Food[]> {
    return this.http.get<Food[]>(`${this.apiUrl}/foods`);
  }

  createCustomFood(payload: CreateCustomFoodRequest): Observable<Food> {
    return this.http.post<Food>(`${this.apiUrl}/foods`, payload);
  }
}
