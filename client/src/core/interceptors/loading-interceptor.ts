import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading-service';
import { finalize } from 'rxjs/internal/operators/finalize';
import { delay } from 'rxjs';
import { environment } from '../../environments/environment';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(
    delay(environment.httpDelayMs),
    finalize(() => loading.stop())
  );
};
