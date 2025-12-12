import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  getFoods(query: { scope?: string; search?: string; sort?: string; take?: number, brandsOnly?: boolean }): Observable<Food[]> {
    let params = new HttpParams();

    console.log('query:', query);

    if (query.scope) params = params.set('scope', query.scope);   // all|global|mine
    if (query.search) params = params.set('search', query.search);
    if (query.sort) params = params.set('sort', query.sort);      // relevance|recentCreated|recentUsed...
    if (query.take) params = params.set('take', query.take);
    if (query.brandsOnly) params = params.set('brandsOnly', 'true');

    return this.http.get<Food[]>(`${this.apiUrl}/foods`, { params });
  }

  createCustomFood(payload: CreateCustomFoodRequest): Observable<Food> {
    return this.http.post<Food>(`${this.apiUrl}/foods`, payload);
  }
}
