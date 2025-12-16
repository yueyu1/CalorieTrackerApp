import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Meal } from '../../../types/meal';
import { MealService } from '../../../core/services/meal-service';
import { tap } from 'rxjs/internal/operators/tap';
import { MatIconModule } from '@angular/material/icon';
import { MatFormField } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { formatQuantity } from '../../../shared/formatters/quantity-formatter';

@Component({
  selector: 'app-copy-from-date',
  imports: [
    CommonModule,
    MatDatepickerModule, 
    MatFormField, 
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './copy-from-date.html',
  styleUrl: './copy-from-date.css',
})
export class CopyFromDate {
  private pickedDate = signal<Date | null>(null);
  protected loading = signal(false);
  private dialogRef = inject(MatDialogRef<CopyFromDate>);
  private data = inject(MAT_DIALOG_DATA);
  protected sourceMeals = signal<Meal[]>([]);
  private mealService = inject(MealService);
  protected expandedMealId = signal<number | null>(null);
  protected formatQuantity = formatQuantity;

  onDateChanged(date: Date | null) {
    this.pickedDate.set(date);
    if (!date) return;
    this.loading.set(true);
    
    this.mealService.getDailyMeals(this.pickedDate()!.toLocaleDateString('en-CA')).pipe(
      tap((meals) => {
        this.sourceMeals.set(meals);
        this.loading.set(false);
        this.expandedMealId.set(null);
      })
    ).subscribe();
  }

  protected isEligible(m: Meal): boolean {
    return m.id > 0 && m.items.length > 0;
  }

  protected toggleMeal(m: Meal) {
    if (!this.isEligible(m)) return;
    this.expandedMealId.set(this.expandedMealId() === m.id ? null : m.id);
  }

  protected copyMeal(m: Meal) {
    if (!this.isEligible(m)) return;
    this.dialogRef.close({ sourceMealId: m.id, mode: 'append' });
  }

  dateFilter = (d: Date | null): boolean => {
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const candidate = new Date(d);
    candidate.setHours(0, 0, 0, 0);
    return candidate <= today;
  }
  
  close() {
    this.dialogRef.close();
  }
}
