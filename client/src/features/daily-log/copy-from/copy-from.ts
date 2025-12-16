import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CopySourceQuickPick } from '../../../types/copy';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CopyFromDate } from '../copy-from-date/copy-from-date';

@Component({
  selector: 'app-copy-from',
  imports: [CommonModule, MatMenuModule, MatIconModule, MatDividerModule],
  templateUrl: './copy-from.html',
  styleUrl: './copy-from.css',
})
export class CopyFrom {
  private dialog = inject(MatDialog);
  protected readonly isBusy = signal(false);
  @Input() quickPicks: CopySourceQuickPick[] = [];
  @Output() copyRequested = new EventEmitter<{ sourceMealId: number; mode: 'append' | 'replace' }>();

  requestCopy(sourceMealId: number, mode: 'append' | 'replace' = 'append') {
    if (!sourceMealId || sourceMealId <= 0) return;
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
