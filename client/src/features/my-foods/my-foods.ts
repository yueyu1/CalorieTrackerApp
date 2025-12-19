import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { CustomFoodDialogResult } from '../../types/custom-food';
import { FoodService } from '../../core/services/food-service';
import { ToastService } from '../../core/services/toast-service';

@Component({
  selector: 'app-my-foods',
  imports: [
    CommonModule,
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
  protected readonly showArchived = signal(false);
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected form: FormGroup;
  protected readonly foods = this.foodService.foods;
  protected readonly visibleFoods = this.foodService.foods;
  protected readonly loading = this.foodService.loading;
  protected readonly deletingIds = this.foodService.deletingIds;

  constructor() {
    this.form = this.fb.group({
      search: [''],
      sort: ['recent'],
    });
  }

  ngOnInit(): void {
    this.foodService.loadFoods({ scope: 'mine' });
  }

  // readonly visibleFoods = computed(() => {
  //   const q = this.searchCtrl.value.trim().toLowerCase();
  //   const sort = this.sortCtrl.value;
  //   const includeArchived = this.showArchived();

  //   let rows = this.foods();

  //   if (!includeArchived) rows = rows.filter(r => !r.isArchived);

  //   if (q) {
  //     rows = rows.filter(r =>
  //       r.name.toLowerCase().includes(q) ||
  //       (r.brand ?? '').toLowerCase().includes(q) ||
  //       this.primaryUnitLabel(r).toLowerCase().includes(q)
  //     );
  //   }
  //   rows = [...rows].sort((a, b) => {
  //     switch (sort) {
  //       case 'name': return a.name.localeCompare(b.name);
  //       case 'calories': return b.calories - a.calories;
  //       case 'protein': return b.protein - a.protein;
  //       case 'carbs': return b.carbs - a.carbs;
  //       case 'fat': return b.fat - a.fat;
  //       case 'recent':
  //       default:
  //         return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  //     }
  //   });

  //   // Keep selection clean if rows disappear
  //   const visibleIds = new Set(rows.map(r => r.id));
  //   const nextSel = new Set([...this.selectedIds()].filter(id => visibleIds.has(id)));
  //   if (nextSel.size !== this.selectedIds().size) this.selectedIds.set(nextSel);

  //   return rows;
  // });

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
    this.showArchived.update(v => !v);
  }

  // Actions
  onCreateFood() {
    const ref = this.dialog.open(CustomFoodDialog, {
      width: '800px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((result: CustomFoodDialogResult | null) => {
      if (!result) return;
      this.foodService.getFoods({ scope: 'mine' }).subscribe({
        next: () => this.toast.success('Food created successfully.'),
        error: (err) => this.toast.error(err)
      });
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
    ref.afterClosed().subscribe((result: CustomFoodDialogResult | null) => {
      if (!result) return;
      this.foodService.getFoods({ scope: 'mine' }).subscribe({
        next: () => this.toast.success('Food created successfully.'),
        error: (err) => this.toast.error(err)
      });
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
      next: () => this.toast.success('Food restored successfully.'),
      error: (err) => this.toast.error(err)
    });
  }

  onDelete(food: Food) {
    this.foodService.deleteCustomFood(food.id).subscribe({
      next: () => this.toast.success('Food deleted successfully.'),
      error: (err) => this.toast.error(err)
    });
  }

  onBulkDelete() {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;

    for (const id of ids) {
      this.foodService.deleteCustomFood(id).subscribe({
        error: (err) => this.toast.error(err)
      });
    }
  }

  get searchCtrl() {
    return this.form.get('search')!;
  }

  get sortCtrl() {
    return this.form.get('sort')!;
  }
}
