import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { GoalSettingsDto, GoalSettingsResponseDto } from '../../types/goals';
import { environment } from '../../environments/environment';
import { catchError, finalize, Observable, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoalSettingsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  readonly goalSettings = signal<GoalSettingsDto | null>(null);
  readonly isSet = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);

  readonly targetCalories = computed(() => this.goalSettings()?.calories ?? 0);
  readonly macroTargets = computed(() => {
    const g = this.goalSettings();
    if (!g) return { protein: 0, carbs: 0, fat: 0 };

    if (g.macroMode === 'grams') {
      return {
        protein: g.protein,
        carbs: g.carbs,
        fat: g.fat
      };
    }

    return {
      protein: (g.calories * g.protein / 100) / 4,
      carbs: (g.calories * g.carbs / 100) / 4,
      fat: (g.calories * g.fat / 100) / 9
    };
  });

  loadGoalSettings(): void {
    this.isLoading.set(true);
    this.getGoalSettings().pipe(
      tap((dto) => {
        if (dto.isSet) {
          this.isSet.set(true);
          this.goalSettings.set(dto.settings);
        } else {
          this.isSet.set(false);
          this.goalSettings.set(null);
        }
      }),
      finalize(() => {
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error('Failed to load goal settings.', error);
        return throwError(() => error);
      })
    ).subscribe();
  }

  getGoalSettings(): Observable<GoalSettingsResponseDto> {
    return this.http.get<GoalSettingsResponseDto>(`${this.apiUrl}/goal-settings`);
  }

  save(dto: GoalSettingsDto) {
    return this.http.post<GoalSettingsResponseDto>(`${this.apiUrl}/goal-settings`, dto).pipe(
      tap((dto) => {
        this.isSet.set(true);
        this.goalSettings.set(dto.settings);
      })
    );
  }
}
