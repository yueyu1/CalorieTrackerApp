import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UpsertCustomFoodRequest, CustomFoodDialogResult } from '../../../../types/food';
import { FoodService } from '../../../../core/services/food-service';
import { Food } from '../../../../types/food';
import { UnitService } from '../../../../core/services/unit-service';
import { MealService } from '../../../../core/services/meal-service';
import { switchMap } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { P } from '@angular/cdk/keycodes';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './custom-food-dialog.html',
  styleUrl: './custom-food-dialog.css',
})
export class CustomFoodDialog {
  private foodService = inject(FoodService);
  private unitService = inject(UnitService);
  private mealsService = inject(MealService);
  private dialogRef = inject(MatDialogRef<CustomFoodDialog>);
  private data = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  protected form: FormGroup;
  protected saving = this.foodService.saving;
  protected isCreating = signal(false);
  protected isEditting = signal(false);

  protected mode = computed<'create' | 'edit'>(() => {
    return this.data?.mode === 'edit' ? 'edit' : 'create';
  });

  protected primaryButtonLabel = computed(() => {
    if (this.data?.mealType) {
      return `Save & add to ${this.data.mealType}`;
    }
    else {
      return 'Save food';
    }
  });

  protected servingUnits = [
    { value: 'g', label: 'g' },
    { value: 'oz', label: 'oz' },
    { value: 'ml', label: 'ml' },
  ];

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

    const payload: UpsertCustomFoodRequest = {
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

    if (this.mode() === 'edit' && this.data?.food) {
      this.isEditting.set(true);
      this.form.disable();
      this.dialogRef.disableClose = true;
      this.foodService.editCustomFood(this.data.food.id, payload).subscribe({
        next: () => {
          this.isEditting.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isEditting.set(false);
          console.error(err);
          this.dialogRef.close(true);
        }
      });
    } else { // Create mode
      this.isCreating.set(true);
      this.form.disable();
      this.dialogRef.disableClose = true;
      this.foodService.createCustomFood(payload).pipe(
        switchMap((createdFood: Food) => {
          return this.mealsService.addFoodsToMeal(
            this.data.mealId,
            this.data.mealType,
            this.data.mealDate,
            [{
              foodId: createdFood.id,
              quantity: 1,
              unit: createdFood.units[0].code,
            }]
          )
        })
      ).subscribe({
        next: () => {
          this.isCreating.set(false);
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isCreating.set(false);
          console.error(err);
          this.dialogRef.close(true);
        }
      });
    }
  }
}
