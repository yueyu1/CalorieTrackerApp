import { Component, DestroyRef, EventEmitter, inject, input, Input, Output, signal } from '@angular/core';
import { CopySourceQuickPick } from '../../../types/copy';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CopyFromDate } from '../copy-from-date/copy-from-date';
import { MealService } from '../../../core/services/meal-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meal } from '../../../types/meal';
import { ToastService } from '../../../core/services/toast-service';
import { finalize } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-copy-from',
  imports: [
    MatMenuModule, 
    MatIconModule, 
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './copy-from.html',
  styleUrl: './copy-from.css',
})
export class CopyFrom {
  private distroyRef = inject(DestroyRef);
  private mealService = inject(MealService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  protected isCopying = signal(false);
  @Input() targetMeal: Meal = {} as Meal;
  @Input() quickPicks: CopySourceQuickPick[] = [];
  @Output() copyRequested = new EventEmitter<{ sourceMealId: number; mode: 'append' | 'replace' }>();
  @Output() busyChanged = new EventEmitter<boolean>();

  requestCopy(sourceMealId: number, mode: 'append' | 'replace' = 'append') {
    if (!sourceMealId || sourceMealId <= 0) return;

    this.isCopying.set(true);
    this.busyChanged.emit(true);

    this.mealService.copyEntriesBetweenMeals(sourceMealId, this.targetMeal, mode).pipe(
      takeUntilDestroyed(this.distroyRef),
      finalize(() => {
        this.isCopying.set(false);
        this.busyChanged.emit(false);
      })
    ).subscribe({
      next: () => {
        this.toast.success(`Entries copied to ${this.targetMeal.mealType}.`);
      },
      error: (err) => {
        console.error('Error copying meal entries:', err);
        this.toast.error(`Failed to copy entries to ${this.targetMeal.mealType}. Please try again.`);
      }
    });

    this.copyRequested.emit({ sourceMealId, mode });
  }

  openChooseDate(): void {
    const ref = this.dialog.open(CopyFromDate, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: false,
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
        this.requestCopy(result.sourceMealId, result.mode);
    });
  }
}
