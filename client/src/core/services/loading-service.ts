import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private count = signal(0);
  private visible = signal(false);
  private timer?: number;

  readonly isLoading = computed(() => this.visible());

  start() {
    this.count.update(c => c + 1);

    if (this.count() === 1) {
      this.timer = window.setTimeout(() => {
        this.visible.set(true);
      }, 150);
    }
  }

  stop() {
    this.count.update(c => Math.max(0, c - 1));

    if (this.count() === 0) {
      clearTimeout(this.timer);
      this.visible.set(false);
    }
  }
}
