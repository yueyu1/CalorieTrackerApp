import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreateCustomFoodRequest } from '../../../types/custom-food';
import { FoodService } from '../../../core/services/food-service';
import { Food } from '../../../types/food';

@Component({
  selector: 'app-custom-food-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './custom-food-dialog.html',
  styleUrl: './custom-food-dialog.css',
})
export class CustomFoodDialog {
  private dialogRef = inject(MatDialogRef<CustomFoodDialog>);
  private data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  protected form: FormGroup;
  protected isSaving = signal(false);
  private foodService = inject(FoodService);

  protected servingUnits = [
    { value: 'g', label: 'g' },
    { value: 'oz', label: 'oz' },
    { value: 'ml', label: 'ml' },
  ];
  
  protected primaryButtonLabel = computed(() => {
    if (this.isSaving()) {
      return 'Saving...';
    }

    if (this.data?.mealTypeLabel) {
      return `Save & add to ${this.data.mealTypeLabel}`;
    }

    return 'Save food';
  });

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      brand: ['', [Validators.maxLength(80)]],
      
      servingDescription: ['', [Validators.required, Validators.maxLength(40)]],
      servingAmount: [1, [Validators.required, Validators.min(0.1)]],
      servingUnit: ['g', Validators.required],

      calories: [0, [Validators.required, Validators.min(0)]],
      protein: [0, [Validators.required, Validators.min(0)]],
      carbs: [0, [Validators.required, Validators.min(0)]],
      fat: [0, [Validators.required, Validators.min(0)]]
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: CreateCustomFoodRequest = {
      name: this.form.value.name!.trim(),
      brand: this.form.value.brand?.trim() || null,
      servingDescription: this.form.value.servingDescription!.trim(),
      servingAmount: this.form.value.servingAmount!,
      servingUnit: this.form.value.servingUnit!,
      calories: this.form.value.calories!,
      protein: this.form.value.protein!,
      carbs: this.form.value.carbs!,
      fat: this.form.value.fat!
    };

    this.isSaving.set(true);

    this.foodService.createCustomFood(payload).subscribe({
      next: (createdFood: Food) => {
        this.isSaving.set(false);
        this.dialogRef.close({
          foodId: createdFood.id,
          unit: createdFood.units[0].code,
        });
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }
}
