import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core/primitives/di';
import { catchError } from 'rxjs/internal/operators/catchError';
import { AccountService } from '../services/account-service';
import { ToastService } from '../services/toast-service';
import { Router } from '@angular/router';
import { throwError } from 'rxjs/internal/observable/throwError';
import { environment } from '../../environments/environment';
import { Injector } from '@angular/core';

function isAuthEndpoint(url: string) {
  return (
    url.includes('/account/login') ||
    url.includes('/account/register') ||
    url.includes('/account/refresh-token')
  );
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const toastService = inject(ToastService);
  const accountService = inject(AccountService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const router = injector.get(Router);
      switch (error.status) {
        case 400:
          let message = '';
          const body = error.error;

          if (typeof body === 'string') {
            message = body;
          } else if (body.errors) { // validation errors
            const modelStateErrors = [];
            for (const key in body.errors) {
              if (body.errors[key]) {
                modelStateErrors.push(body.errors[key]);
              }
            }
            message = modelStateErrors.flat().join(' ');
          }
          toastService.error(message);
          break;
        case 401:
          const url = req.url;

          // Refresh token failed -> session expired
          if (url.includes('/account/refresh-token')) {
            accountService.logoutLocal();
            toastService.error('Your session has expired. Please log in again.');
            router.navigate(['/account/login'], { queryParams: { returnUrl: router.url } });
            break;
          }

          // Login failed -> let the login page handle messaging (avoid duplicate toast)
          if (url.includes('/account/login')) {
            // do nothing here
            break;
          }

          // Register failed -> let the register page handle messaging (avoid duplicate toast)
          if (url.includes('/account/register')) {
            // do nothing here
            break;
          }
          
          // Logout failed -> force local logout
          if (url.includes('/account/logout')) {
            accountService.logoutLocal();
            break;
          }

          // Non-auth 401: let refreshOn401Interceptor handle it (no toast/redirect here)
          break;
        case 403:
          toastService.error('You do not have permission to perform this action.');
          break;
        case 404:
          if (error.status === 404 && req.url.startsWith(environment.apiUrl)) {
            toastService.error('The requested resource was not found.');
          }
          break;
        case 500:
          toastService.error('A server error occurred. Please try again later.');
          break;
        default:
          toastService.error('Something went wrong');
          break;
      }
      return throwError(() => error);
    })
  );
};
