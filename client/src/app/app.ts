import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Nav } from "../layout/nav/nav";
import { LayoutService } from '../core/services/layout-service';
import { AccountService } from '../core/services/account-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSlideToggleModule, Nav],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('client');
  protected readonly layoutService = inject(LayoutService);
  protected readonly accountService = inject(AccountService);

  ngOnInit(): void {
    this.accountService.setCurrentUser();
  }
}
