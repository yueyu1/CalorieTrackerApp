import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from '../core/interceptors/jwt-interceptor';
import { errorInterceptor } from '../core/interceptors/error-interceptor';
import { provideNativeDateAdapter } from '@angular/material/core';
import { loadingInterceptor } from '../core/interceptors/loading-interceptor';
import { AccountService } from '../core/services/account-service';
import { finalize } from 'rxjs/internal/operators/finalize';
import { refreshOn401Interceptor } from '../core/interceptors/refresh-on-401-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideNativeDateAdapter(),
    provideHttpClient(
      withInterceptors([jwtInterceptor, refreshOn401Interceptor, errorInterceptor, loadingInterceptor])
    ),
    provideAppInitializer(() => {
      const accountService = inject(AccountService);
      return accountService.initializeSession().pipe(
        finalize(() => {
          const splash = document.getElementById('initial-splash');
          if (splash) {
            splash.classList.add('is-hiding');
            setTimeout(() => {
              splash.remove();
            }, 150);
          }
        })
      );
    })
  ]
};
