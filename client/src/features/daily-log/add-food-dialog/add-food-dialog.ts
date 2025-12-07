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

interface UnitOption {
  id: string;
  label: string;
}

interface FoodItem {
  id: number;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  units: UnitOption[];
}

@Component({
  selector: 'app-add-food-dialog',
  imports: [
    ReactiveFormsModule,
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
  protected loading = signal(true);
  protected form!: FormGroup;
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddFoodDialog>);
  private data = inject(MAT_DIALOG_DATA) as
    | { mealId: number; mealType?: string; mealDate?: string }
    | null;
  protected selectedIds = new Set<number>();
  protected foods: FoodItem[] = [];

  seedFoods = [
    {
      id: 1,
      name: 'Grilled Chicken Breast',
      brand: 'Brand A',
      calories: 110,
      protein: 26,
      carbs: 0,
      fat: 3,
      units: [
        { id: 'serving', label: '1 serving (85 g)' },
        { id: '100g', label: '100 g' },
        { id: '4oz', label: '4 oz' },
      ],
    },
    {
      id: 2,
      name: 'Quinoa',
      brand: 'Brand B',
      calories: 150,
      protein: 6,
      carbs: 27,
      fat: 3,
      units: [
        { id: 'serving', label: '1 serving (120 g)' },
        { id: '100g', label: '100 g' },
      ],
    },
    {
      id: 3,
      name: 'rice',
      brand: 'Brand C',
      calories: 200,
      protein: 6,
      carbs: 27,
      fat: 3,
      units: [
        { id: 'serving', label: '1 serving (120 g)' },
        { id: '100g', label: '100 g' },
      ],
    },
    {
      id: 4,
      name: 'noddles',
      brand: 'Brand D',
      calories: 200,
      protein: 6,
      carbs: 27,
      fat: 3,
      units: [
        { id: 'serving', label: '1 serving (120 g)' },
        { id: '100g', label: '100 g' },
      ],
    },
    {
      id: 5,
      name: 'corns',
      brand: 'Brand E',
      calories: 200,
      protein: 6,
      carbs: 27,
      fat: 3,
      units: [
        { id: 'serving', label: '1 serving (120 g)' },
        { id: '100g', label: '100 g' },
      ],
    },
    // ...more foods
  ];

  constructor() {
    this.form = this.fb.group({
      search: [''],
      foods: this.fb.array([]),
    });
  }

  get searchCtrl(): FormControl {
    return this.form.get('search') as FormControl;
  }

  get foodsArray(): FormArray {
    return this.form.get('foods') as FormArray;
  }

  activeFilter: 'all' | 'myFoods' | 'recent' | 'brands' = 'all';

  ngOnInit(): void {
    // TODO: replace this with real API call
    // this.foodService.getFoods().subscribe(foods => { ... });

    setTimeout(() => {
      this.foods.push(...this.seedFoods);

      this.buildFormFromFoods();
      this.loading.set(false);
    }, 1000);
  }

  private buildFormFromFoods(): void {
    this.form = this.fb.group({
      search: [''],
      foods: this.fb.array(
        this.foods.map(() =>
          this.fb.group({
            quantity: [1],
            unitId: ['serving'],
          })
        )
      ),
    });
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

  get selectedCalories(): number {
    return this.foods.reduce((sum, food, index) => {
      if (!this.selectedIds.has(food.id)) return sum;
      const group = this.foodsArray.at(index) as FormGroup;
      const quantity = group.get('quantity')!.value ?? 0;
      return sum + food.calories * quantity;
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
    group.get('quantity')!.setValue(Math.max(current - 1, 0));
  }

  onQtyInput(index: number, value: string, event?: Event): void {
    event?.stopPropagation();
    const group = this.foodsArray.at(index) as FormGroup;
    const numeric = Number(value);
    group.get('quantity')!.setValue(
      Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
    );
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

  confirmAdd(): void {
    const items = this.foods
      .map((food, index) => ({ food, index }))
      .filter(x => this.selectedIds.has(x.food.id))
      .map(x => {
        const group = this.foodsArray.at(x.index) as FormGroup;
        return {
          foodId: x.food.id,
          quantity: group.get('quantity')!.value ?? 0,
          unitId: group.get('unitId')!.value ?? 'serving',
        };
      });

    console.log('Add to meal payload', items);
    // this.dialogRef?.close({ mealId: this.data?.mealId, items });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
