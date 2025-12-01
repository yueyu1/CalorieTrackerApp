import { Component, inject } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../shared/material';
import { Router, RouterModule } from '@angular/router';
import { AccountService } from '../../core/services/account-service';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-nav',
  imports: [CommonModule,RouterModule, MatMenuModule, ...MATERIAL_IMPORTS
  ],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  protected accountService = inject(AccountService);
  private router = inject(Router);

  logout(): void {
    this.accountService.logout();
    this.router.navigate(['/']);
  }
}
