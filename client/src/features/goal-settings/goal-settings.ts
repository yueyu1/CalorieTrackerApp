import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GoalPreset, GoalSettingsDto } from '../../types/goals';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { GoalSettingsService } from '../../core/services/goal-settings-service';
import { tap } from 'rxjs/internal/operators/tap';
import { ToastService } from '../../core/services/toast-service';

@Component({
  selector: 'app-goals-settings',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './goal-settings.html',
  styleUrl: './goal-settings.css',
})
export class GoalSettings implements OnInit {
  private fb = inject(FormBuilder);
  protected form: FormGroup;
  protected activePreset = signal<GoalPreset | null>('maintain');
  protected goalSettingsService = inject(GoalSettingsService);
  private toast = inject(ToastService);

  private initial = signal<GoalSettingsDto>({
    calories: 2200,
    macroMode: 'percent',
    protein: 30,
    carbs: 40,
    fat: 30,
    weightUnit: 'g',
    showMacroPercent: true,
  });

  constructor() {
    this.form = this.fb.group({
      calories: [this.initial().calories, [Validators.required, Validators.min(800), Validators.max(8000)]],
      macroMode: [this.initial().macroMode],
      protein: [this.initial().protein, [Validators.required, Validators.min(0)]],
      carbs: [this.initial().carbs, [Validators.required, Validators.min(0)]],
      fat: [this.initial().fat, [Validators.required, Validators.min(0)]],
      weightUnit: [this.initial().weightUnit],
      showMacroPercent: [this.initial().showMacroPercent],
    })
  }

  ngOnInit(): void {
    this.goalSettingsService.getSettings().pipe(
      tap(() =>{
        if (this.goalSettingsService.goalsSet()) {
          this.form.setValue(this.goalSettingsService.goalSettings()!)
          this.form.markAsPristine();
        } else {
          this.form.setValue(this.initial());
          this.form.markAsPristine();
        }
      })
    ).subscribe();
  }

  applyPreset(preset: GoalPreset) {
    this.activePreset.set(preset);

    const calories = this.caloriesControl?.value;

    if (preset === 'maintain') {
      this.form.patchValue({ calories, macroMode: 'percent', protein: 30, carbs: 40, fat: 30 });
    }
    if (preset === 'cut') {
      this.form.patchValue({ calories: Math.max(1200, Math.round(calories * 0.85)), macroMode: 'percent', protein: 35, carbs: 35, fat: 30 });
    }
    if (preset === 'bulk') {
      this.form.patchValue({ calories: Math.min(8000, Math.round(calories * 1.10)), macroMode: 'percent', protein: 30, carbs: 45, fat: 25 });
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.currentDto();
    this.goalSettingsService.save(dto).pipe(
      tap(() => {
        this.form.markAsPristine();
      })
    ).subscribe();

    this.initial.set(dto);
    this.form.markAsPristine();
    this.toast.success('Goals saved');
  }

  cancel() {
    const dto = this.initial();
    this.form.patchValue(dto, { emitEvent: false });
    this.form.markAsPristine();
  }

  /* Private helpers */

  private currentDto(): GoalSettingsDto {
    return {
      calories: this.caloriesControl?.value,
      macroMode: this.macroModeControl?.value,
      protein: this.proteinControl?.value,
      carbs: this.carbsControl?.value,
      fat: this.fatControl?.value,
      weightUnit: this.form.get('weightUnit')?.value,
      showMacroPercent: this.form.get('showMacroPercent')?.value,
    };
  }

  // /* Getters for template */

  get caloriesControl() {
    return this.form.get('calories');
  }

  get proteinControl() {
    return this.form.get('protein');
  }

  get carbsControl() {
    return this.form.get('carbs');
  }
  get fatControl() {
    return this.form.get('fat');
  }

  get macroModeControl() {
    return this.form.get('macroMode');
  }

  get summaryText(): string {
    const calories = this.caloriesControl?.value;
    return `Target: ${calories.toLocaleString()} kcal`;
  }

  get percentSum(): number | null {
    if (this.macroModeControl?.value !== 'percent') return null;
    const p = this.proteinControl?.value ?? 0;
    const c = this.carbsControl?.value ?? 0;
    const f = this.fatControl?.value ?? 0;
    return p + c + f;
  }

  get percentInvalid(): boolean {
    return this.percentSum !== null && this.percentSum !== 100;
  }

  get macroCaloriesPreview(): number | null {
    if (this.macroModeControl?.value !== 'grams') return null;
    const p = this.proteinControl?.value ?? 0;
    const c = this.carbsControl?.value ?? 0;
    const f = this.fatControl?.value ?? 0;
    // 4/4/9 rule
    return Math.round(p * 4 + c * 4 + f * 9);
  }

  get isDirty(): boolean {
    const cur = this.currentDto();
    const init = this.initial();
    return JSON.stringify(cur) !== JSON.stringify(init);
  }
}
