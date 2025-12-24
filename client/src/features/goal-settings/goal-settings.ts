import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
import { ToastService } from '../../core/services/toast-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    MatTooltip,
    MatDividerModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule
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
  private destroyRef = inject(DestroyRef);
  private goalSettings = this.goalSettingsService.goalSettings;
  protected isLoading = this.goalSettingsService.isLoading;
  private isSet = this.goalSettingsService.isSet;
  protected isSaving = signal(false);
  private initial = signal<GoalSettingsDto>({
    calories: 2200,
    macroMode: 'percent',
    protein: 30,
    carbs: 40,
    fat: 30,
    weightUnit: 'g',
    showMacroPercent: true,
  });

  protected baseCalories = signal<number>(this.initial().calories);

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
    this.goalSettingsService.loadGoalSettings().subscribe({
      next: () => {
        if (this.isSet()) {
          this.baseCalories.set(this.goalSettings()!.calories);
          this.initial.set(this.goalSettings()!);
          this.form.setValue(this.goalSettings()!, { emitEvent: false });
        } else {
          this.form.setValue(this.initial(), { emitEvent: false });
        }
        this.activePreset.set(this.detectPreset(this.currentDto()));
        this.form.markAsPristine();
        this.form.markAsUntouched();

        this.form.valueChanges
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.activePreset.set(this.detectPreset(this.currentDto()));
          });
      },
      error: (err) => {
        console.error(err);
        this.toast.error('Failed to load goal settings');
      }
    });
  }

  applyPreset(preset: GoalPreset) {
    const base = this.baseCalories();

    if (preset === 'maintain') {
      this.form.patchValue({ calories: base, macroMode: 'percent', protein: 30, carbs: 40, fat: 30 });
    }
    if (preset === 'cut') {
      this.form.patchValue({ calories: Math.max(1200, Math.round(base * 0.85)), macroMode: 'percent', protein: 35, carbs: 35, fat: 30 });
    }
    if (preset === 'bulk') {
      this.form.patchValue({ calories: Math.min(8000, Math.round(base * 1.10)), macroMode: 'percent', protein: 30, carbs: 45, fat: 25 });
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.macroModeControl?.value === 'percent' && this.percentInvalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.currentDto();

    this.isSaving.set(true);

    this.goalSettingsService.save(dto).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.initial.set(dto);
        this.baseCalories.set(dto.calories);
        this.form.patchValue(dto, { emitEvent: false });
        this.form.markAsPristine();
        this.form.markAsUntouched();
        this.toast.success('Goals saved');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error(err);
        this.toast.error('Failed to save goals');
      }
    });
  }

  cancel() {
    const dto = this.initial();
    this.form.patchValue(dto, { emitEvent: false });
    this.form.markAsPristine();
  }

  applyDefaults() {
    this.save();
  }

  private detectPreset(dto: GoalSettingsDto): GoalPreset | null {
    // Presets only apply in percent mode
    if (dto.macroMode !== 'percent') return null;

    // Match by macro split only (ignore calories)
    if (dto.protein === 30 && dto.carbs === 40 && dto.fat === 30) return 'maintain';
    if (dto.protein === 35 && dto.carbs === 35 && dto.fat === 30) return 'cut';
    if (dto.protein === 30 && dto.carbs === 45 && dto.fat === 25) return 'bulk';

    return null;
  }

  get showNotSetChip(): boolean {
    // First-time user AND no unsaved edits yet
    return !this.goalSettingsService.isSet() && !this.isDirty;
  }

  get showAppliedChip(): boolean {
    // Applied only when the user has saved goals at least once:
    return this.goalSettingsService.isSet() && !this.isDirty;
  }

  get showPendingChip(): boolean {
    return this.isDirty && !this.percentInvalid;
  }

  get showInvalidChip(): boolean {
    return this.isDirty && this.percentInvalid;
  }

  get chipText(): string {
    if (this.showInvalidChip) return 'Cannot apply (total ≠ 100%)';
    if (this.showPendingChip) return 'Changes not applied';
    if (this.showNotSetChip) return 'Not set yet';
    return 'Applied to Daily Log';
  }

  get chipIcon(): string {
    if (this.showInvalidChip) return 'error';
    if (this.showPendingChip) return 'hourglass_top';
    if (this.showNotSetChip) return 'info';
    return 'check_circle';
  }

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

  onCaloriesBlur() {
    const v = Number(this.caloriesControl?.value);

    if (Number.isFinite(v) && v > 0) {
      this.baseCalories.set(v);
    }
  }

  /* Getters for template */

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

  get primaryLabel(): string {
    return this.goalSettingsService.isSet() ? 'Save changes' :
      this.isDirty ? 'Set goals' : 'Apply defaults';
  }

  get needsSave(): boolean {
    return !this.goalSettingsService.isSet() || this.isDirty;
  }
}
