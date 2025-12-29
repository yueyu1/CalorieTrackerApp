import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AccountService } from '../../core/services/account-service';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { LoadingService } from '../../core/services/loading-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LayoutService } from '../../core/services/layout-service';
import { filter } from 'rxjs/internal/operators/filter';

@Component({
  selector: 'app-nav',
  imports: [
    RouterModule,
    UpperCasePipe,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  protected accountService = inject(AccountService);
  private router = inject(Router);
  protected loading = inject(LoadingService);
  protected layoutService = inject(LayoutService);
  protected isLoginPage = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.isLoginPage.set(e.urlAfterRedirects.startsWith('/account/login')));
  }
  
  logout(): void {
    this.accountService.logoutLocal();
    this.accountService.logoutServer().subscribe(() => this.router.navigate(['/']));
  }

  onBrandClick(): void {
    if (this.accountService.currentUser()) {
      this.router.navigate(['/daily-log']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
