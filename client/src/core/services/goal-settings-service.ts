import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { GoalSettingsDto, GoalSettingsResponseDto } from '../../types/goals';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GoalSettingsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  readonly goalSettings = signal<GoalSettingsDto | null>(null);
  readonly isSet = signal<boolean>(false);
  readonly goalsLoading = signal<boolean>(false);

  save(dto: GoalSettingsDto) {
    return this.http.post<GoalSettingsResponseDto>(`${this.apiUrl}/goal-settings`, dto).pipe(
      tap((dto) => {
        this.isSet.set(true);
        this.goalSettings.set(dto.settings);
      })
    );
  }

  getSettings() {
    this.goalsLoading.set(true);
    return this.http.get<GoalSettingsResponseDto>(`${this.apiUrl}/goal-settings`).pipe(
      tap((dto) => {
        if (dto.isSet) {
          this.isSet.set(true);
          this.goalSettings.set(dto.settings);
        } else {
          this.isSet.set(false);
          this.goalSettings.set(null);
        }
        this.goalsLoading.set(false);
      })
    );
  }
}
