import { Component, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreateCustomFoodRequest, CustomFoodDialogResult } from '../../../../types/custom-food';
import { FoodService } from '../../../../core/services/food-service';
import { Food } from '../../../../types/food';
import { UnitService } from '../../../../core/services/unit-service';

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
  private foodService = inject(FoodService);
  private unitService = inject(UnitService);
  private dialogRef = inject(MatDialogRef<CustomFoodDialog>);
  private data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  protected form: FormGroup;
  protected saving = this.foodService.saving;

  protected mode = computed<'create' | 'edit'>(() => {
    return this.data?.mode === 'edit' ? 'edit' : 'create';
  });

  protected servingUnits = [
    { value: 'g', label: 'g' },
    { value: 'oz', label: 'oz' },
    { value: 'ml', label: 'ml' },
  ];
  
  protected primaryButtonLabel = computed(() => {
    if (this.saving()) {
      return 'Saving...';
    }

    if (this.data?.mealTypeLabel) {
      return `Save & add to ${this.data.mealTypeLabel}`;
    }

    return 'Save food';
  });

  constructor() {
    const food: Food = this.data?.food;
    const servingDescription = food && food.units && food.units.length > 0 ? 
      this.unitService.extractServingDescription(food.units[0].label) : '';

    this.form = this.fb.group({
      name: [this.mode() === 'edit' ? food.name : '', [Validators.required, Validators.maxLength(80)]],
      brand: [this.mode() === 'edit' ? food.brand || '' : '', [Validators.maxLength(80)]],

      servingDescription: [this.mode() === 'edit' ? servingDescription : '', [Validators.required, Validators.maxLength(40)]],
      servingAmount: [this.mode() === 'edit' ? food.baseQuantity : 1, [Validators.required, Validators.min(0.1)]],
      servingUnit: [this.mode() === 'edit' ? food.baseUnit : 'g', Validators.required],

      calories: [this.mode() === 'edit' ? food.calories : 0, [Validators.required, Validators.min(0)]],
      protein: [this.mode() === 'edit' ? food.protein : 0, [Validators.required, Validators.min(0)]],
      carbs: [this.mode() === 'edit' ? food.carbs : 0, [Validators.required, Validators.min(0)]],
      fat: [this.mode() === 'edit' ? food.fat : 0, [Validators.required, Validators.min(0)]]
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

    this.foodService.createCustomFood(payload).subscribe({
      next: (createdFood: Food) => {
        const result: CustomFoodDialogResult = {
          foodId: createdFood.id,
          unitCode: createdFood.units[0].code,
        };
        this.dialogRef.close(result);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }
}
