import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Food } from '../../types/food';
import { MatSelectModule } from "@angular/material/select";
import { MatDialog } from '@angular/material/dialog';
import { CustomFoodDialog } from './dialogs/custom-food-dialog/custom-food-dialog';
import { CustomFoodDialogResult } from '../../types/food';
import { FoodService } from '../../core/services/food-service';
import { ToastService } from '../../core/services/toast-service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-my-foods',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './my-foods.html',
  styleUrl: './my-foods.css',
})
export class MyFoods implements OnInit {
  private foodService = inject(FoodService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  protected form: FormGroup;
  protected showArchived = signal(false);
  protected searchQuery = signal('');
  private sortMode = signal('recent');
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected readonly foods = this.foodService.foods;
  protected readonly loading = this.foodService.loading;
  protected readonly deletingIds = this.foodService.deletingIds;

  constructor() {
    this.form = this.fb.group({
      search: [''],
      sort: ['recent'],
    });

    effect(() => {
      if (this.visibleFoods().length === 0 && this.searchQuery().trim() === '') {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.foodService.loadFoods({ scope: 'mine' });

    this.searchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.selectedIds.set(new Set());
    });

    this.sortCtrl.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((value) => {
      this.sortMode.set(value);
    });
  }

  readonly visibleFoods = computed(() => {
    const q = this.searchQuery();
    const sort = this.sortMode();
    const includeArchived = this.showArchived();

    let rows = this.foods();

    if (!includeArchived) rows = rows.filter(r => !r.isArchived);

    if (q.trim().toLowerCase()) {
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.brand ?? '').toLowerCase().includes(q) ||
        this.primaryUnitLabel(r).toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'calories': return b.calories - a.calories;
        case 'protein': return b.protein - a.protein;
        case 'carbs': return b.carbs - a.carbs;
        case 'fat': return b.fat - a.fat;
        case 'recent':
        default:
          return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
      }
    });
    return rows;
  });

  readonly archivedCount = computed(() => {
    return this.foods().filter(f => f.isArchived).length;
  });

  // Display helpers
  
  primaryUnitLabel(food: Food): string {
    if (food.units?.length) return food.units[0].label;
    return `${food.baseQuantity} ${food.baseUnit}`;
  }

  baseLine(food: Food): string {
    return `Base: ${food.baseQuantity} ${food.baseUnit}`;
  }

  // ----- selection -----
  isSelected(id: number) {
    return this.selectedIds().has(id);
  }

  toggleRow(id: number) {
    const next = new Set(this.selectedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds.set(next);
  }

  toggleAllVisible(checked: boolean) {
    const next = new Set(this.selectedIds());
    const ids = this.visibleFoods().map(r => r.id);
    if (checked) ids.forEach(id => next.add(id));
    else ids.forEach(id => next.delete(id));
    this.selectedIds.set(next);
  }

  get allVisibleSelected(): boolean {
    const rows = this.visibleFoods();
    if (!rows.length) return false;
    const sel = this.selectedIds();
    return rows.every(r => sel.has(r.id));
  }

  get someVisibleSelected(): boolean {
    const rows = this.visibleFoods();
    if (!rows.length) return false;
    const sel = this.selectedIds();
    const count = rows.filter(r => sel.has(r.id)).length;
    return count > 0 && count < rows.length;
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  toggleArchived() {
    this.showArchived.set(!this.showArchived());

    if (!this.showArchived()) {
      // Clear selection of archived items
      const next = new Set(this.selectedIds());
      for (const food of this.foods()) {
        if (food.isArchived && next.has(food.id)) {
          next.delete(food.id);
        }
      }
      this.selectedIds.set(next);
    }
  }

  // Actions
  onCreateFood() {
    const ref = this.dialog.open(CustomFoodDialog, {
      width: '800px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((result: CustomFoodDialogResult | null) => {
      if (!result) return;
      this.toast.success('Food created successfully.')
    });
  }

  onEdit(food: Food) {
    const ref = this.dialog.open(CustomFoodDialog, {
      width: '800px',
      maxWidth: '95vw',
      data: { 
        mode: 'edit',
        food: food,
        foodId: food.id
      }
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.toast.success('Food updated successfully.');
    });
  }

  onArchive(food: Food) {
    this.foodService.archiveCustomFood(food.id).subscribe({
      next: () => this.toast.success('Food archived successfully.'),
      error: (err) => this.toast.error(err)
    });
  }

  onRestore(food: Food) {
    this.foodService.restoreCustomFood(food.id).subscribe({
      next: () => {
        if (this.showArchived() && this.archivedCount() === 0) {
          this.showArchived.set(false);
        }
        this.toast.success('Food restored successfully.')
      },
      error: (err) => this.toast.error(err)
    });
  }

  onDelete(food: Food) {
    this.foodService.deleteCustomFood(food.id).subscribe({
      next: () => { 
        if (this.showArchived() && this.archivedCount() === 0) {
          this.showArchived.set(false);
        }
        this.toast.success('Food deleted successfully.')
      },
      error: (err) => this.toast.error(err)
    });
  }

  onBulkDelete() {
    const visibleIds = this.visibleFoods().map(f => f.id);
    const toDelete = [...this.selectedIds()].filter(id => visibleIds.includes(id));
    if (!toDelete.length) return;
    this.foodService.deleteCustomFoodsBulk(toDelete).subscribe({
      next: () => {
        if (this.showArchived() && this.archivedCount() === 0) {
          this.showArchived.set(false);
        }
        this.toast.success('Selected foods deleted successfully.');
        this.clearSelection();
      },
      error: (err) => this.toast.error(err)
    });
  }

  get searchCtrl() {
    return this.form.get('search')!;
  }

  get sortCtrl() {
    return this.form.get('sort')!;
  }

  get emptyTitle(): string {
    if (this.searchQuery().trim()) {
      return 'No foods match your search.';
    }
    return 'You have no custom foods.';
  }
}
