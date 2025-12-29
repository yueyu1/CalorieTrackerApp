import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { User } from '../../types/user';
import { catchError, finalize, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private httpClient = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  currentUser = signal<User | null>(null);
  sessionInitialized = signal(false);

  login(model: { email: string; password: string }) {
    const url = `${this.baseUrl}/account/login`;
    return this.httpClient.post<User>(url, model, {withCredentials: true}).pipe(
      tap(user => {
        if (user) {
          this.setCurrentUser(user);
          this.startRefreshTokenInterval();
        }
      })
    );
  }

  register(model: { email: string; displayName: string; password: string }) {
    const url = `${this.baseUrl}/account/register`;
    return this.httpClient.post<User>(url, model, {withCredentials: true}).pipe(
      tap(user => {
        if (user) {
          this.setCurrentUser(user);
          this.startRefreshTokenInterval();
        }
      })
    );
  }

  initializeSession(): Observable<User | null> {
    const url = `${this.baseUrl}/account/refresh-token`;
    return this.httpClient.post<User>(url, {}, {withCredentials: true}).pipe(
      tap(user => {
        if (user) {
          this.setCurrentUser(user);
          this.startRefreshTokenInterval();
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
    return this.httpClient.post<User>(url, {}, {withCredentials: true});
  }

  startRefreshTokenInterval() {
    setInterval(() => {
      const url = `${this.baseUrl}/account/refresh-token`;
      this.httpClient.post<User>(url, {}, {withCredentials: true}). subscribe({
        next: (user) => {
          this.setCurrentUser(user);
        },
        error: () => {
          this.logout();
        }
      });
    }, 4 * 60 * 1000); // every 4 minutes 
  }
  
  setCurrentUser(user: User) {
    this.currentUser.set(user);
  }

  logout() {
    this.currentUser.set(null);
  }
}
