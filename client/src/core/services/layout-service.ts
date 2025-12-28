import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  readonly showNav = signal(true);
  readonly isRegistering = signal(false);
  readonly isLoggingIn = signal(false);

  hideNav() {
    this.showNav.set(false);
  }

  showNavBar() {
    this.showNav.set(true);
  }
}
