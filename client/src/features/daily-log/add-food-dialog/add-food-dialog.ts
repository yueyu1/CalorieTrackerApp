import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, computed, DestroyRef, inject, OnInit, Signal, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MealType } from '../../../types/meal';
import { FoodService } from '../../../core/services/food-service';
import { debounceTime, distinctUntilChanged, Observable, Subscription, tap } from 'rxjs';
import { Food } from '../../../types/food';
import { MealEntryItem } from '../../../types/meal-entry-item';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MealService } from '../../../core/services/meal-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { nutritionFor } from '../../../shared/nutrition/nutrition-calculator';
import { Nutrition, RowNutritionEntry } from '../../../types/nutrition';

@Component({
  selector: 'app-add-food-dialog',
  imports: [
    ReactiveFormsModule,
    DecimalPipe,

    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './add-food-dialog.html',
  styleUrl: './add-food-dialog.css',
})
export class AddFoodDialog implements OnInit {
  private foodService = inject(FoodService);
  private mealsService = inject(MealService);
  protected loading = signal(true);
  protected form!: FormGroup;
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddFoodDialog>);
  protected data = inject(MAT_DIALOG_DATA) as {
    mealId: number; mealType: MealType; mealDate: string
  };
  protected foods = signal<Food[]>([]);
  protected activeFilter: 'all' | 'myFoods' | 'recent' | 'brands' = 'all';
  protected isAddingFood = signal(false);

  protected loadingMore = signal(false);
  protected hasMore = signal(true);

  private readonly pageSize = 25;
  private offset = 0;

  // Map<foodId, { quantity, unitId, snapshot }>
  protected selected = signal(new Map<number, { quantity: number; unitId: number; snapshot: Food }>());

  // Map<foodId, RowNutritionEntry>
  protected rowNutrition = new Map<number, RowNutritionEntry>();

  // computed total calories of selected items
  protected readonly selectedCalories = computed(() => {
    const map = this.selected();
    let total = 0;
    for (const { quantity, unitId, snapshot } of map.values()) {
      const nutrition = nutritionFor(snapshot, quantity, unitId);
      total += nutrition.calories;
    }
    return total;
  });

  constructor() {
    this.form = this.fb.group({
      search: [''],
      foods: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.loadFirstPage();

    this.searchCtrl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      tap(() => this.loadFirstPage())
    ).subscribe();
  }


  /* ---------- nutrition calculation ---------- */

  getRowNutrition(food: Food): Nutrition {
    return this.rowNutrition.get(food.id)?.nutritionSig() ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }

  private buildRowSignals(food: Food, group: FormGroup) {
    // Create a signal to track the form group value changes
    const valueSig = signal(group.getRawValue());

    // Subscribe to form group value changes to update the signal
    const sub: Subscription = group.valueChanges.subscribe(v => valueSig.set(v));

    // Create a computed signal for nutrition based on the value signal
    const nutritionSig = computed(() => {
      const v = valueSig();
      return nutritionFor(food, Number(v.quantity ?? 0), Number(v.unitId ?? 0));
    });

    // Clean up any existing subscription for this food
    this.rowNutrition.get(food.id)?.cleanup();

    // Store the computed signal and cleanup function
    this.rowNutrition.set(food.id, {
      nutritionSig,
      cleanup: () => sub.unsubscribe()
    });
  }

  private clearRowNutrition(): void {
    for (const entry of this.rowNutrition.values()) {
      entry.cleanup();
    }
    this.rowNutrition.clear();
  }

  /* ---------- selection management ---------- */

  ensureSelected(index: number, seed?: { quantity?: number, unitId?: number }): void {
    const food = this.foods()[index];
    if (this.isSelected(food.id)) return;

    // enable controls
    this.setRowEnabled(index, true);

    // seed from current form values unless overridden
    const row = this.foodsArray.at(index) as FormGroup;
    const quantity = seed?.quantity ?? Number(row.get('quantity')!.value ?? 0);
    const unitId = seed?.unitId ?? Number(row.get('unitId')!.value);
    this.selected.update(prev => {
      const next = new Map(prev);
      next.set(food.id, { quantity: quantity, unitId: unitId, snapshot: food });
      return next;
    });
  }

  deselect(index: number): void {
    const food = this.foods()[index];
    const row = this.foodsArray.at(index) as FormGroup;
    if (!this.isSelected(food.id)) return;
    this.selected.update(prev => {
      const next = new Map(prev);
      next.delete(food.id);
      return next;
    });
    this.setRowEnabled(index, false);
    row.get('quantity')!.setValue(1, { emitEvent: false });
    row.get('unitId')!.setValue(food.units[0]?.id ?? null, { emitEvent: false });
  }

  toggleSelected(id: number, index: number): void {
    if (this.selected().has(id)) {
      this.deselect(index);
    } else {
      this.ensureSelected(index);
    }
  }

  isSelected(id: number): boolean {
    return this.selected().has(id);
  }

  private setRowEnabled(index: number, enabled: boolean): void {
    const row = this.foodsArray.at(index) as FormGroup;

    const qty = row.get('quantity');
    const unitId = row.get('unitId');

    if (!qty || !unitId) return;

    if (enabled) {
      qty.enable({ emitEvent: false });
      unitId.enable({ emitEvent: false });
    } else {
      qty.disable({ emitEvent: false });
      unitId.disable({ emitEvent: false });
    }
  }


  /* ---------- quantity + unit controls ---------- */

  increaseQty(index: number, event?: MouseEvent): void {
    event?.stopPropagation();

    const row = this.foodsArray.at(index) as FormGroup;
    const current = Number(row.get('quantity')!.value ?? 0);
    const next = current + 1;

    // seed selection with the next quantity
    this.ensureSelected(index, { quantity: next });

    // keep the form control in sync too
    row.get('quantity')!.setValue(next, { emitEvent: false });
  }

  decreaseQty(index: number, event?: MouseEvent): void {
    event?.stopPropagation();
    const food = this.foods()[index];
    if (!this.isSelected(food.id)) return;

    const row = this.foodsArray.at(index) as FormGroup;
    const current = Number(row.get('quantity')!.value ?? 0);
    const next = Math.max(0, current - 1);
    row.get('quantity')!.setValue(next);

    if (next <= 0 && this.selected().has(food.id)) {
      // if quantity hits 0, unselect this food
      this.deselect(index);
    } else {
      // keep selected map in sync
      const cur = this.selected().get(food.id)!;
      this.selected.update((prev) => {
        const nextMap = new Map(prev);
        nextMap.set(food.id, { ...cur, quantity: next });
        return nextMap;
      });
    }
  }

  onQtyChange(index: number): void {
    const food = this.foods()[index];
    if (!this.isSelected(food.id)) return;

    const group = this.foodsArray.at(index) as FormGroup;
    const raw = group.get('quantity')!.value;
    const parsed = Number(raw);
    const quantity = Number.isFinite(parsed) ? parsed : 1;

    // Update selected map
    const cur = this.selected().get(food.id)!;
    this.selected.update((prev) => {
      const nextMap = new Map(prev);
      nextMap.set(food.id, { ...cur, quantity });
      return nextMap;
    });
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

  onUnitChange(index: number): void {
    const food = this.foods()[index];
    if (!this.isSelected(food.id)) return;

    const group = this.foodsArray.at(index) as FormGroup;
    const unitId = group.get('unitId')!.value;

    const cur = this.selected().get(food.id)!;
    this.selected.update(() => {
      const nextMap = new Map();
      nextMap.set(food.id, { ...cur, unitId });
      return nextMap;
    });
  }

  /* ---------- data loading + pagination ---------- */

  private loadFirstPage(): void {
    this.offset = 0;
    this.hasMore.set(true);

    this.loading.set(true);
    this.loadingMore.set(false);
    this.clearRowNutrition();
    this.foods.set([]);
    this.form.setControl('foods', this.fb.array([]));

    this.fetchFoodsPage(this.offset, this.pageSize).subscribe({
      next: (page) => {
        this.appendFoods(page);
        this.offset += page.length;
        this.hasMore.set(page.length === this.pageSize);
        this.loading.set(false);
      },
      error: () => {
        this.hasMore.set(false);
        this.loading.set(false);
      }
    });
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);

    this.fetchFoodsPage(this.offset, this.pageSize).subscribe({
      next: (page) => {
        this.appendFoods(page);
        this.offset += page.length;
        this.hasMore.set(page.length === this.pageSize);
        this.loadingMore.set(false);
      },
      error: () => {
        this.hasMore.set(false);
        this.loadingMore.set(false);
      }
    });
  }

  private appendFoods(newFoods: Food[]): void {
    if (newFoods.length === 0) return;

    // 1) append to the signal list
    this.foods.update(curr => [...curr, ...newFoods]);

    // 2) append matching form rows (so we don't reset existing quantities)
    const arr = this.foodsArray;
    for (const food of newFoods) {
      const group = this.fb.group({
        quantity: [{ value: 1, disabled: true }],
        unitId: [{ value: food.units[0]?.id ?? null, disabled: true }],
      });
      arr.push(group);
      this.buildRowSignals(food, group);
    }
  }

  private fetchFoodsPage(skip: number, take: number): Observable<Food[]> {
    const search = (this.searchCtrl.value ?? '').trim();
    const scope =
      this.activeFilter === 'myFoods' ? 'mine' :
        'all';
    const sort =
      this.activeFilter === 'recent' ? 'recentUsed' :
        'relevance';
    const brandsOnly = this.activeFilter === 'brands';

    return this.foodService.getFoods({
      scope,
      search,
      sort,
      skip,
      take,
      brandsOnly
    });
  }

  onListScroll(evt: Event): void {
    if (!this.hasMore() || this.loading() || this.loadingMore()) return;

    const el = evt.target as HTMLElement;
    const thresholdPx = 220; // load a bit before bottom
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= thresholdPx) {
      this.loadMore();
    }
  }

  /* ---------- filters + actions ---------- */

  setFilter(filter: typeof this.activeFilter): void {
    this.activeFilter = filter;
    this.loadFirstPage();
  }

  openCustomFood(): void {
    this.dialogRef.close({
      action: 'createCustomFood',
      mealId: this.data?.mealId,
      mealType: this.data?.mealType,
      mealDate: this.data?.mealDate,
    });
  }

  confirmAdd(): void {
    const items: MealEntryItem[] = [];
    for (const { quantity, unitId, snapshot } of this.selected().values()) {
      items.push({
        foodId: snapshot.id,
        quantity,
        unit: snapshot.units.find(u => u.id === unitId)?.code ?? '',
      });
    }

    this.dialogRef.disableClose = true;
    this.isAddingFood.set(true);
    this.searchCtrl.disable({ emitEvent: false });

    this.mealsService.addFoodsToMeal(
      this.data.mealId, this.data.mealType, this.data.mealDate, items).subscribe({
        next: () => {
          this.isAddingFood.set(false);
          this.dialogRef?.close({
            count: items.length
          });
        },
        error: (err) => {
          this.isAddingFood.set(false);
          console.error('Failed to add food to meal', err);
          this.dialogRef?.close();
        }
      });
  }

  onClose(): void {
    this.dialogRef.close();
  }

  /* ---------- form getters ---------- */
  get searchCtrl(): FormControl {
    return this.form.get('search') as FormControl;
  }

  get foodsArray(): FormArray {
    return this.form.get('foods') as FormArray;
  }

  get showMyFoodsEmptyState(): boolean {
    return (
      !this.loading() &&
      this.activeFilter === 'myFoods' &&
      this.foods().length === 0
    );
  }

  get myFoodsEmptyTitle(): string {
    const q = (this.searchCtrl.value ?? '').trim();
    return q
      ? 'No matching custom foods'
      : 'No custom foods yet';
  }

  get myFoodsEmptySubtitle(): string {
    const q = (this.searchCtrl.value ?? '').trim();
    return q
      ? `You don't have any custom foods matching “${q}”.`
      : 'Create your own foods to quickly add them to meals.';
  }
}
