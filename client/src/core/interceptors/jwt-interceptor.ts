import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AccountService } from '../services/account-service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip auth header for login/register endpoints
  if (req.url.endsWith('/account/login') || req.url.endsWith('/account/register')) {
    return next(req);
  }

  const accountService = inject(AccountService);
  const user = accountService.currentUser();
  if (user?.token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${user.token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
