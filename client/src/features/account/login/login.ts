import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LayoutService } from '../../../core/services/layout-service';
import { MATERIAL_IMPORTS } from '../../../shared/material';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../../core/services/account-service';
import { ToastService } from '../../../core/services/toast-service';

@Component({
  selector: 'app-login',
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ...MATERIAL_IMPORTS,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private layoutService = inject(LayoutService);
  private accountService = inject(AccountService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  protected loginForm: FormGroup;
  protected isSubmitting = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  ngOnInit(): void {
    this.layoutService.hideNav();
  }

  ngOnDestroy(): void {
    this.layoutService.showNavBar();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isSubmitting.set(true);

      this.accountService.login(this.loginForm.value).subscribe({
        next: () => {
          this.router.navigate(['/daily-log']);
          this.toastService.success('Login successful!');
        },
        error: () => {
          this.toastService.error('Login failed. Please check your credentials and try again.');
          this.isSubmitting.set(false);
        },
        complete: () => {
          // fake delay
          setTimeout(() => {
            this.isSubmitting.set(false);
          }, 500);
        }
      });
    }
  }
}
