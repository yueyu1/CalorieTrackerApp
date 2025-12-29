import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { User } from '../../types/user';
import { catchError, finalize, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  currentUser = signal<User | null>(null);
  sessionInitialized = signal(false);

  login(model: { email: string; password: string }) {
    const url = `${this.baseUrl}/account/login`;
    return this.http.post<User>(url, model, { withCredentials: true }).pipe(
      tap(user => {
        if (user) {
          this.setCurrentUser(user);
        }
      })
    );
  }

  register(model: { email: string; displayName: string; password: string }) {
    const url = `${this.baseUrl}/account/register`;
    return this.http.post<User>(url, model, { withCredentials: true }).pipe(
      tap(user => {
        if (user) {
          this.setCurrentUser(user);
        }
      })
    );
  }

  initializeSession(): Observable<User | null> {
    const url = `${this.baseUrl}/account/refresh-token`;
    return this.http.post<User>(url, {}, { withCredentials: true }).pipe(
      tap(user => {
        if (user) {
          this.setCurrentUser(user);
        }
      }),
      catchError(() => {
        return of(null);
      }),
      finalize(() => {
        this.sessionInitialized.set(true);
      })
    );
  }

  refreshToken() {
    const url = `${this.baseUrl}/account/refresh-token`;
    return this.http.post<User>(url, {}, { withCredentials: true });
  }

  setCurrentUser(user: User) {
    this.currentUser.set(user);
  }

  logoutLocal() {
    this.currentUser.set(null);
  }

  logoutServer() {
    const url = `${this.baseUrl}/account/logout`;
    return this.http.post<void>(url, {}, { withCredentials: true });
  }
}
