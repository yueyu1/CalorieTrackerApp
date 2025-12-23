import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { GoalSettingsService } from '../../core/services/goal-settings-service';
import { TodayMacro, DayPoint } from '../../types/progress';
import { getPastDays, toYmd } from '../../shared/utils/date-utils';
import { MealService } from '../../core/services/meal-service';

@Component({
  selector: 'app-progress',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class Progress implements OnInit {
  protected router = inject(Router);
  private mealService = inject(MealService);
  private goalSettingsService = inject(GoalSettingsService);
  private goalSettings = this.goalSettingsService.goalSettings;
  protected readonly targetCalories = this.goalSettingsService.targetCalories;
  
  protected readonly isLoading = computed(() => this.mealService.rangeLoading() || this.goalSettingsService.isLoading());
  
  protected readonly hasWeekData = computed(() =>
    this.week().some(d => d.calories !== null));

  readonly todayCalories = computed(() => {
    const today = toYmd(new Date());
    const t = this.mealService.rangeTotals().find(dt => dt.date === today);
    return t?.calories || 0;
  });

  readonly todayMacros = computed<TodayMacro[]>(() => {
    const today = toYmd(new Date());
    const t = this.mealService.rangeTotals().find(dt => dt.date === today);
    const targets = this.goalSettingsService.macroTargets();
    return [
      { key: 'protein', label: 'Protein', icon: 'radio_button_checked', value: t?.protein || 0, goal: targets?.protein || 0 },
      { key: 'carbs', label: 'Carbs', icon: 'apps', value: t?.carbs || 0, goal: targets?.carbs || 0 },
      { key: 'fat', label: 'Fat', icon: 'change_history', value: t?.fat || 0, goal: targets?.fat || 0 },
    ];
  });

  readonly week = computed<DayPoint[]>(() => {
    const last7Days = getPastDays(7);
    const totals = this.mealService.rangeTotals();
    return last7Days.map(date => {
      const dayTotals = totals.find(t => t.date === date);
      return {
        label: this.dayLabel(date),
        calories: dayTotals?.calories ?? null,
      };
    });
  });

  readonly clamp100 = (n: number) => Math.max(0, Math.min(100, n));

  // ===== Derived =====
  readonly hasGoal = computed(() => {
    const g = this.targetCalories();
    return !!g && g > 0;
  });

  readonly caloriesPct = computed(() => {
    if (!this.hasGoal()) return 0;
    return this.safePct(this.todayCalories(), this.targetCalories());
  });

  readonly avgCalories = computed(() => {
    const days = this.week();
    if (!days.length) return 0;
    const sum = days.reduce((acc, d) => acc + (d.calories ?? 0), 0);
    return Math.round(sum / days.length);
  });

  readonly daysHitGoal = computed(() => {
    if (!this.hasGoal()) return 0;
    const target = this.targetCalories();
    return this.week().filter(d => d.calories && d.calories >= target).length;
  });

  readonly caloriesDeltaLabel = computed(() => {
    if (!this.hasGoal()) return '';
    const target = this.targetCalories();
    const today = this.todayCalories();
    const diff = target - today;
    const abs = Math.abs(diff);

    if (diff > 0) return `${abs.toLocaleString()} kcal remaining`;
    if (diff < 0) return `${abs.toLocaleString()} kcal over target`;
    return `Right on target`;
  });

  readonly macroPct = (m: TodayMacro) => this.safePct(m.value, m.goal);

  // Chart scale
  readonly yMin = computed(() => {
    const vals = this.week()
      .map(d => d.calories).filter((v): v is number => v != null);
    if (!vals.length) return 0;
    const min = Math.min(...vals);
    return Math.floor((min - 120) / 50) * 50;
  });

  readonly yMax = computed(() => {
    const vals = this.week()
      .map(d => d.calories).filter((v): v is number => v != null);
    if (!vals.length) return 0;
    const max = Math.max(...vals);
    return Math.ceil((max + 120) / 50) * 50;
  });

  readonly linePaths = computed(() => {
    if (!this.hasWeekData()) return [] as string[];

    const pts = this.chartPoints(); // (point | null)[]
    const paths: string[] = [];

    let segment: Array<{ x: number; y: number }> = [];

    for (const p of pts) {
      if (!p) {
        if (segment.length >= 2) paths.push(this.pointsToPath(segment));
        segment = [];
        continue;
      }
      segment.push(p);
    }

    if (segment.length >= 2) paths.push(this.pointsToPath(segment));

    return paths;
  });

  private pointsToPath(points: Array<{ x: number; y: number }>) {
    const [first, ...rest] = points;
    const d0 = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
    const restD = rest.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return restD ? `${d0} ${restD}` : d0;
  }

  readonly pointDots = computed(() =>
    this.chartPoints().filter((p): p is { x: number; y: number; label: string; calories: number } => !!p)
  );

  readonly targetY = computed(() => {
    return this.toChartY(this.targetCalories());
  });

  ngOnInit(): void {
    const days = getPastDays(7); // oldest -> newest
    const from = days[0];
    const to = days[days.length - 1];

    this.mealService.loadMealsInRange(from, to);
    this.goalSettingsService.loadGoalSettings();
  }

  // ===== Helpers =====
  private dayLabel(ymd: string): string {
    const d = new Date(`${ymd}T00:00:00`); // local midnight, safe
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
  };

  private safePct(value: number, goal: number) {
    if (!goal || goal <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
  }

  // bar heights are computed in template from yMin/yMax
  barHeightPct(cal: number | null) {
    if (!this.hasWeekData()) return 0;
    if (cal == null) return 0;

    const min = this.yMin();
    const max = this.yMax();
    if (max <= min) return 0;
    const pct = (cal - min) / (max - min);
    return Math.max(0, Math.min(1, pct)) * 100;
  }

  private chartPoints() {
    const data = this.week();
    if (!data.length) return [] as Array<{
      x: number; y: number; label: string; calories: number;
    } | null>;

    const left = 36;
    const right = 36;
    const top = 18;
    const bottom = 42;

    const w = 700 - left - right;
    const h = 220 - top - bottom;

    const min = this.yMin();
    const max = this.yMax();
    const denom = Math.max(1, max - min);

    return data.map((d, i) => {
      const x = left + (w * i) / Math.max(1, data.length - 1);
      if (d.calories == null) return null;
      const yNorm = (d.calories - min) / denom;
      const y = top + (1 - yNorm) * h;
      return { x, y, label: d.label, calories: d.calories };
    });
  }

  private toChartY(value: number) {
    const left = 36;
    const right = 36;
    const top = 18;
    const bottom = 42;

    const h = 220 - top - bottom;

    const min = this.yMin();
    const max = this.yMax();
    const denom = Math.max(1, max - min);

    const yNorm = (value - min) / denom;
    return top + (1 - yNorm) * h;
  }

  goToGoals() {
    this.router.navigateByUrl('/goal-settings');
  }
}
