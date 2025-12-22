import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';

type MacroKey = 'protein' | 'carbs' | 'fat';

type TodayMacro = {
  key: MacroKey;
  label: string;
  icon: string;      // material icon name
  value: number;     // grams
  goal: number;      // grams
};

type DayPoint = {
  label: string;     // e.g. "M"
  calories: number;
};

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
export class Progress {
  private router = inject(Router);

  readonly targetCalories = signal(2200);

  readonly todayCalories = signal(1975);

  readonly todayMacros = signal<TodayMacro[]>([
    { key: 'protein', label: 'Protein', icon: 'radio_button_checked', value: 150, goal: 165 },
    { key: 'carbs', label: 'Carbs', icon: 'apps', value: 250, goal: 275 },
    { key: 'fat', label: 'Fat', icon: 'change_history', value: 75, goal: 73 },
  ]);

  readonly week = signal<DayPoint[]>([
    { label: 'M', calories: 2100 },
    { label: 'T', calories: 2050 },
    { label: 'W', calories: 2320 },
    { label: 'T', calories: 2175 },
    { label: 'F', calories: 2085 },
    { label: 'S', calories: 2380 },
    { label: 'S', calories: 2305 },
  ]);

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
    const sum = days.reduce((acc, d) => acc + d.calories, 0);
    return Math.round(sum / days.length);
  });

  readonly daysHitGoal = computed(() => {
    if (!this.hasGoal()) return 0;
    const target = this.targetCalories();
    return this.week().filter(d => d.calories <= target).length;
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
    const vals = this.week().map(d => d.calories);
    if (!vals.length) return 0;
    const min = Math.min(...vals);
    return Math.floor((min - 120) / 50) * 50; // nice-ish padding
  });

  readonly yMax = computed(() => {
    const vals = this.week().map(d => d.calories);
    if (!vals.length) return 0;
    const max = Math.max(...vals);
    return Math.ceil((max + 120) / 50) * 50;
  });

  // SVG path + points (viewBox 0 0 700 220)
  readonly linePath = computed(() => {
    const pts = this.chartPoints();
    if (!pts.length) return '';
    const d0 = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    const rest = pts.slice(1).map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return `${d0} ${rest}`;
  });

  readonly pointDots = computed(() => this.chartPoints());

  readonly targetY = computed(() => {
    return this.toChartY(this.targetCalories());
  });

  // ===== Helpers =====
  private safePct(value: number, goal: number) {
    if (!goal || goal <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
  }

  // bar heights are computed in template from yMin/yMax
  barHeightPct(cal: number) {
    const min = this.yMin();
    const max = this.yMax();
    if (max <= min) return 0;
    const pct = (cal - min) / (max - min);
    return Math.max(0, Math.min(1, pct)) * 100;
  }

  private chartPoints() {
    const data = this.week();
    if (!data.length) return [];

    const left = 36;     // padding inside viewBox
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
