import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatOptionModule } from '@angular/material/core';
import { MealType } from '../../../types/meal';
import { FoodService } from '../../../core/services/food-service';
import { debounceTime, distinctUntilChanged, Observable, Subscription, switchMap, tap } from 'rxjs';
import { Food } from '../../../types/food';
import { MealEntryItem } from '../../../types/meal-entry-item';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MealService } from '../../../core/services/meal-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { delay, of } from 'rxjs';

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
  private searchSub: Subscription | undefined;
  protected loading = signal(true);
  protected form!: FormGroup;
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddFoodDialog>);
  protected data = inject(MAT_DIALOG_DATA) as {
    mealId: number; mealType: MealType; mealDate: string
  };
  protected selectedIds = new Set<number>();
  protected foods = signal<Food[]>([]);
  protected activeFilter: 'all' | 'myFoods' | 'recent' | 'brands' = 'all';
  protected isAddingFood = signal(false);

  protected loadingMore = signal(false);
  protected hasMore = signal(true);

  private readonly pageSize = 25;
  private offset = 0;

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

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
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
    this.loadFirstPage();
  }

  private loadFirstPage(): void {
    this.offset = 0;
    this.hasMore.set(true);
    this.selectedIds.clear();

    this.loading.set(true);
    this.loadingMore.set(false);
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

  onListScroll(evt: Event): void {
    if (!this.hasMore() || this.loading() || this.loadingMore()) return;

    const el = evt.target as HTMLElement;
    const thresholdPx = 220; // load a bit before bottom
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= thresholdPx) {
      this.loadMore();
    }
  }

  private appendFoods(newFoods: Food[]): void {
    if (newFoods.length === 0) return;

    // 1) append to the signal list
    this.foods.update(curr => [...curr, ...newFoods]);

    // 2) append matching form rows (so we don't reset existing quantities)
    const arr = this.foodsArray;
    for (const food of newFoods) {
      arr.push(this.fb.group({
        quantity: [1],
        unitId: [food.units[0]?.id ?? null],
      }));
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

  /**
   * Close this dialog with a special action so the caller
   * can open a dedicated "Create custom food" flow.
   */
  openCustomFood(): void {
    this.dialogRef.close({
      action: 'createCustomFood',
      mealId: this.data?.mealId,
      mealType: this.data?.mealType,
      mealDate: this.data?.mealDate,
    });
  }

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
