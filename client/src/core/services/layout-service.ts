import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  readonly showNav = signal(true);

  hideNav() {
    this.showNav.set(false);
  }

  showNavBar() {
    this.showNav.set(true);
  }
}
