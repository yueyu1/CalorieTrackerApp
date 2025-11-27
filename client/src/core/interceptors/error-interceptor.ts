import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core/primitives/di';
import { catchError } from 'rxjs/internal/operators/catchError';
import { AccountService } from '../services/account-service';
import { ToastService } from '../services/toast-service';
import { Router } from '@angular/router';
import { throwError } from 'rxjs/internal/observable/throwError';
import { environment } from '../../environments/environment';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastService = inject(ToastService);
  const accountService = inject(AccountService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
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
          accountService.logout();
          toastService.error('Your session has expired. Please log in again.');
          router.navigate(['/account/login']);
          break;
        case 403:
          toastService.error('You do not have permission to perform this action.');
          break;
        case 404:
          if(error.status === 404 && req.url.startsWith(environment.apiUrl)) {
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
