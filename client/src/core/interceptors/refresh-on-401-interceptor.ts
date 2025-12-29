import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core/primitives/di';
import { AccountService } from '../services/account-service';
import { throwError } from 'rxjs/internal/observable/throwError';
import { catchError, switchMap } from 'rxjs';

function isAuthEndpoint(url: string) {
  return (
    url.includes('/account/login') ||
    url.includes('/account/register') ||
    url.includes('/account/refresh-token') ||
    url.includes('/account/logout')
  );
}

export const refreshOn401Interceptor: HttpInterceptorFn = (req, next) => {
  const accountService = inject(AccountService);
  return next(req).pipe(
    catchError((error) => {
      if (error.status !== 401 || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }
      return accountService.refreshToken().pipe(
        switchMap((user) => {
          if (!user?.token) {
            accountService.logoutLocal();
            return throwError(() => error);
          }
          accountService.setCurrentUser(user);

          const clonedReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${user.token}`,
            },
          });
          return next(clonedReq);
        }),
        catchError((err) => {
          accountService.logoutLocal();
          return throwError(() => err);
        })
      );
    })  
  );
};
