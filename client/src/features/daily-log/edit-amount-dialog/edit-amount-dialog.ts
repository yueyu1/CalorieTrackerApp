import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { DecimalPipe } from '@angular/common';
import { MealItem } from '../../../types/meal';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-edit-amount-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,

    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './edit-amount-dialog.html',
  styleUrl: './edit-amount-dialog.css',
})
export class EditAmountDialog {
  private fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EditAmountDialog>);
  protected readonly data = inject<MealItem>(MAT_DIALOG_DATA);
  protected form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      quantity: [
        this.data.quantity, [Validators.required, Validators.min(0.01)]
      ],
      unitId: [this.data.unit, [Validators.required]],
    });
  }

  get quantityCtrl() {
    return this.form.get('quantity');
  }

  get unitIdCtrl() {
    return this.form.get('unitId');
  }

  get selectedUnit() {
    const unitId = this.unitIdCtrl?.value;
    return this.data.units.find(u => u.code === unitId);
  }

  get macros() {
    const qty = this.quantityCtrl?.value ?? 0;
    const unit = this.selectedUnit;

    if (!unit || !qty) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    // Base amount of the CURRENT saved MealItem (e.g., in grams/ml)
    const currentBaseAmount = this.data.quantity * this.data.conversionFactor;
    if (!currentBaseAmount) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    // Macros PER one base unit (e.g., 1 g or 1 ml)
    const baseCalories = this.data.calories / currentBaseAmount;
    const baseProtein = this.data.protein / currentBaseAmount;
    const baseCarbs = this.data.carbs / currentBaseAmount;
    const baseFat = this.data.fat / currentBaseAmount;

    // Base amount of the NEW requested quantity
    const newBaseAmount = qty * unit.conversionFactor;

    return {
      calories: baseCalories * newBaseAmount,
      protein: baseProtein * newBaseAmount,
      carbs: baseCarbs * newBaseAmount,
      fat: baseFat * newBaseAmount,
    };
  };

  get previewText() {
    const quantity = this.quantityCtrl?.value ?? 0;
    const unit = this.selectedUnit;

    if (!unit || !quantity) {
      return '';
    }

    const label = unit.label;

    // ---------- CASE 1: "1 serving (100 g)" style ----------
    if (label.includes('(')) {
      // e.g. label = "1 serving (100 g)"
      const match = label.match(/\(([^)]+)\)/); // "100 g"
      const basePart = match ? match[1] : null; // "100 g"

      if (!basePart) {
        return '';
      }

      // Get the numeric amount inside, e.g. 100 from "100 g"
      const amountMatch = basePart.match(/^\d+(\.\d+)?/);
      const baseAmountPerUnit = amountMatch
        ? Number(amountMatch[0])
        : unit.conversionFactor || 1;

      // e.g. 1.5 * 100 = 150
      const newBaseAmount = quantity * baseAmountPerUnit;

      // Get the unit suffix, e.g. "g" from "100 g"
      const baseUnitSuffix = basePart.replace(/^\d+(\.\d+)?\s*/, '');

      return `${newBaseAmount} ${baseUnitSuffix}`;
    }

    // ---------- CASE 2: simple units like "g", "oz", "ml" ----------
    // Just show "quantity + label"
    return `${quantity} ${label}`;
  };

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { quantity, unitId } = this.form.value;
    this.dialogRef.close({
      quantity: Number(quantity),
      unitCode: unitId!,
    });
  }
}
