import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoaderService } from '../loader.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);

  if (req.headers.has('X-Silencioso')) {
    const peticionClonada = req.clone({ headers: req.headers.delete('X-Silencioso') });
    return next(peticionClonada);
  }

  loader.cargando.set(true);

  return next(req).pipe(finalize(() => loader.cargando.set(false)));
};
