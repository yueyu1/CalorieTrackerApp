import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from '../core/interceptors/jwt-interceptor';
import { errorInterceptor } from '../core/interceptors/error-interceptor';
import { provideNativeDateAdapter } from '@angular/material/core';
import { loadingInterceptor } from '../core/interceptors/loading-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideNativeDateAdapter(),
    provideHttpClient(
      withInterceptors([jwtInterceptor, loadingInterceptor, errorInterceptor])
    )
  ]
};
