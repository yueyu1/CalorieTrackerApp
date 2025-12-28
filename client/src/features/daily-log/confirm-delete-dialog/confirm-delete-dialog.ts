import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MealService } from '../../../core/services/meal-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-confirm-delete-dialog',
  imports: [
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './confirm-delete-dialog.html',
  styleUrl: './confirm-delete-dialog.css',
})
export class ConfirmDeleteDialog {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDeleteDialog>);
  protected readonly data = inject(MAT_DIALOG_DATA);
  protected readonly isDeletingEntry = signal(false);
  private mealService = inject(MealService);

  onCancel(): void {
    if (!this.isDeletingEntry()) {
      this.dialogRef.close(false);
    }
  }

  onConfirm(): void {
    this.dialogRef.disableClose = true;
    this.isDeletingEntry.set(true);

    this.mealService.deleteFoodFromMeal(this.data.mealId, this.data.entryId).subscribe({
      next: () => {
        this.isDeletingEntry.set(false);
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('Failed to delete meal entry', err);
        this.isDeletingEntry.set(false);
        this.dialogRef.close(false);
      }
    });
  }
}
