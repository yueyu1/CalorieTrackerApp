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
  readonly goalsSet = signal<boolean>(false);

  save(dto: GoalSettingsDto) {
    return this.http.post<GoalSettingsResponseDto>(`${this.apiUrl}/goal-settings`, dto).pipe(
      tap((dto) => {
        this.goalsSet.set(true);
        this.goalSettings.set(dto.settings);
      })
    );
  }

  getSettings() {
    return this.http.get<GoalSettingsResponseDto>(`${this.apiUrl}/goal-settings`).pipe(
      tap((dto) => {
        if (dto.isSet) {
          this.goalsSet.set(true);
          this.goalSettings.set(dto.settings);
        } else {
          this.goalsSet.set(false);
          this.goalSettings.set(null);
        }
      })
    );
  }
}
