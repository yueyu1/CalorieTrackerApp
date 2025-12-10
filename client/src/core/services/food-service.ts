import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UnitService } from './unit-service';
import { Observable, tap } from 'rxjs';
import { Food } from '../../types/food';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FoodService {
  private http = inject(HttpClient);
  private unitService = inject(UnitService);
  private apiUrl = environment.apiUrl;

  getFoods(): Observable<Food[]> {
    return this.http.get<Food[]>(`${this.apiUrl}/foods`);
  }
}
