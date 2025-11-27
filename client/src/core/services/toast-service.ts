import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private snackBar = inject(MatSnackBar);
  
  show(message: string, panelClass: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
      panelClass: [panelClass]
    });
  }

  success(message: string) {
    this.show(message, 'success-toast');
  }

  error(message: string) {
    this.show(message, 'error-toast');
  }

  warning(message: string) {
    this.show(message, 'warning-toast');
  }

  info(message: string) {
    this.show(message, 'info-toast');
  }
}
