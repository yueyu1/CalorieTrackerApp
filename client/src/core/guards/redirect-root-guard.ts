import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AccountService } from '../services/account-service';

export const redirectRootGuard: CanMatchFn = (route, segments) => {
  const accountService = inject(AccountService);
  const router = inject(Router);

  return accountService.currentUser() 
  ? router.createUrlTree(['/daily-log']) 
  : true;
};
