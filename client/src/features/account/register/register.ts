import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../../shared/material';
import { AccountService } from '../../../core/services/account-service';

function confirmPasswordValidator(matchTo: string): ValidatorFn {
  return (control: any): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent)
      return null;

    const matchingControl = parent.get(matchTo);
    if (!matchingControl)
      return null;

    const password = matchingControl.value;
    const confirmPassword = control.value;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}

@Component({
  selector: 'app-register',
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInput,
    MATERIAL_IMPORTS
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  protected registerForm: FormGroup;
  protected isSubmitting = false;
  private router = inject(Router);
  private accountService = inject(AccountService);

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, confirmPasswordValidator('password')]],
    });
  }

  ngOnInit(): void {
    this.password?.valueChanges.subscribe(() => {
      this.confirmPassword?.updateValueAndValidity({ onlySelf: true });
    });
  }

  get email() {
    return this.registerForm.get('email');
  }

  get displayName() {
    return this.registerForm.get('displayName');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isSubmitting = true;
      const payload = {
        email: this.email?.value,
        displayName: this.displayName?.value,
        password: this.password?.value,
      }
      this.accountService.register(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/daily-log']);
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    } 
  }
}
