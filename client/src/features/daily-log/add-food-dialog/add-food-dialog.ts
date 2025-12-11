import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../../shared/material';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MealType } from '../../../types/meal';
import { FoodService } from '../../../core/services/food-service';
import { tap } from 'rxjs';
import { Food } from '../../../types/food';
import { MealEntryItem } from '../../../types/meal-entry-item';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-add-food-dialog',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MATERIAL_IMPORTS,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatSelectModule,
    MatOptionModule],
  templateUrl: './add-food-dialog.html',
  styleUrl: './add-food-dialog.css',
})
export class AddFoodDialog implements OnInit {
  /* ---------- injections + signals ---------- */
  private foodService = inject(FoodService);
  protected loading = signal(true);
  protected form!: FormGroup;
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddFoodDialog>);
  private data = inject(MAT_DIALOG_DATA) as {
    mealId: number; mealType: MealType; mealDate: string
  };
  protected selectedIds = new Set<number>();
  protected foods = signal<Food[]>([]);

  /* ---------- constructor ---------- */
  constructor() {
    this.form = this.fb.group({
      search: [''],
      foods: this.fb.array([]),
    });
  }

  /* ---------- form getters ---------- */
  get searchCtrl(): FormControl {
    return this.form.get('search') as FormControl;
  }

  get foodsArray(): FormArray {
    return this.form.get('foods') as FormArray;
  }

  /* ---------- filtering ---------- */
  activeFilter: 'all' | 'myFoods' | 'recent' | 'brands' = 'all';

  /* ---------- lifecycle + form setup ---------- */
  ngOnInit(): void {
    setTimeout(() => {
      this.foodService.getFoods().pipe(
        tap(foods => {
          this.foods.set(foods);
          this.buildFormFromFoods();
          this.loading.set(false);
        })
      ).subscribe();
    }, 1000);
  }

  private buildFormFromFoods(): void {
    this.form = this.fb.group({
      search: [''],
      foods: this.fb.array(
        this.foods().map((food) =>
          this.fb.group({
            quantity: [1],
            unitId: [food.units[0].id ?? null],
          })
        )
      ),
    });
  }

  /* ---------- per-row computed values ---------- */

  getRowCalories(index: number): number {
    const food = this.foods()[index];
    if (!food) return 0;

    const scale = this.getRowScale(index);
    return food.calories * scale;
  }

  getRowProtein(index: number): number {
    const food = this.foods()[index];
    if (!food) return 0;

    const scale = this.getRowScale(index);
    return food.protein * scale;
  }

  getRowCarbs(index: number): number {
    const food = this.foods()[index];
    if (!food) return 0;

    const scale = this.getRowScale(index);
    return food.carbs * scale;
  }

  getRowFat(index: number): number {
    const food = this.foods()[index];
    if (!food) return 0;

    const scale = this.getRowScale(index);
    return food.fat * scale;
  }

  private getRowScale(index: number): number {
    const food = this.foods()[index];
    if (!food) return 0;

    const group = this.foodsArray.at(index) as FormGroup;
    const quantity = group.get('quantity')!.value ?? 0;
    if (quantity <= 0) return 0;

    const unitId = group.get('unitId')!.value;
    const unit = food.units.find(u => u.id === unitId);
    if (!unit) return 0;

    const baseAmount = quantity * (unit.conversionFactor ?? 1);
    return baseAmount / food.baseQuantity;
  }


  /* ---------- selection + footer ---------- */

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelected(id: number, index: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
      // ensure there is at least 1 by default
      const group = this.foodsArray.at(index) as FormGroup;
      const qty = group.get('quantity')!.value ?? 0;
      if (qty <= 0) group.get('quantity')!.setValue(1);
    }
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  /**
   * Compute calories using:
   * - quantity (in selected unit)
   * - unit.conversionFactor: how much base-mass one unit represents
   * - food.baseQuantity / food.calories as the reference
   */
  get selectedCalories(): number {
    return this.foods().reduce((sum, food, index) => {
      if (!this.selectedIds.has(food.id)) return sum;
      const group = this.foodsArray.at(index) as FormGroup;
      const quantity = group.get('quantity')!.value ?? 0;
      if (quantity <= 0) return sum;
      const unitId = group.get('unitId')!.value;
      const unit = food.units.find(u => u.id === unitId);
      if (!unit) return sum;
      const baseQuantity = quantity * (unit.conversionFactor ?? 1);
      return sum + (food.calories * baseQuantity) / food.baseQuantity;
    }, 0);
  }

  /* ---------- quantity + unit controls ---------- */

  increaseQty(index: number, event?: MouseEvent): void {
    event?.stopPropagation();
    const group = this.foodsArray.at(index) as FormGroup;
    const current = group.get('quantity')!.value ?? 0;
    group.get('quantity')!.setValue(current + 1);
  }

  decreaseQty(index: number, event?: MouseEvent): void {
    event?.stopPropagation();
    const group = this.foodsArray.at(index) as FormGroup;
    const current = group.get('quantity')!.value ?? 0;
    const next = Math.max(current - 1, 0);
    group.get('quantity')!.setValue(next);

    // if quantity hits 0, unselect this food
    const food = this.foods()[index];
    if (next <= 0 && this.selectedIds.has(food.id)) {
      this.selectedIds.delete(food.id);
    }
  }

  onQtyBlur(index: number): void {
    const group = this.foodsArray.at(index) as FormGroup;
    const raw = group.get('quantity')!.value;

    // Handle null, empty string, NaN, etc.
    if (raw === null || raw === '' || Number.isNaN(Number(raw))) {
      group.get('quantity')!.setValue(1);
      return;
    }

    const numeric = Number(raw);

    // Prevent negative values or zero
    if (numeric <= 0) {
      group.get('quantity')!.setValue(1);
    } else {
      group.get('quantity')!.setValue(numeric);
    }
  }

  onUnitClick(event: MouseEvent): void {
    // prevent row toggle when opening mat-select
    event.stopPropagation();
  }

  /* ---------- filters + actions ---------- */

  setFilter(filter: typeof this.activeFilter): void {
    this.activeFilter = filter;
    // hook your filtering logic into visibleFoods if you want
  }

  /**
   * Build payload for the caller.
   * Send:
   *   quantity: user-entered value
   *   unit:     the unit.code ("serving", "g", "oz", ...)
   * Backend will use ConversionFactor to do the math.
   */
  confirmAdd(): void {
    const items: MealEntryItem[] = this.foods()
      .map((food, index) => {
        const group = this.foodsArray.at(index) as FormGroup;
        const quantity = group.get('quantity')!.value ?? 0;
        return { food, index, quantity };
      })
      .filter(x => this.selectedIds.has(x.food.id) && x.quantity > 0)
      .map(x => {
        const group = this.foodsArray.at(x.index) as FormGroup;
        const unitId = group.get('unitId')!.value;
        const unit = x.food.units.find(u => u.id === unitId) ?? x.food.units[0];
        return {
          foodId: x.food.id,
          quantity: x.quantity,
          unit: unit.code,
        };
      });

    this.dialogRef?.close({
      mealId: this.data?.mealId,
      mealType: this.data?.mealType,
      mealDate: this.data?.mealDate,
      items
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
