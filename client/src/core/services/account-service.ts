import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { User } from '../../types/user';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private httpClient = inject(HttpClient);
  private baseUrl = environment.apiUrl;
  currentUser = signal<User | null>(null);

  login(model: { email: string; password: string }) {
    const url = `${this.baseUrl}/account/login`;
    return this.httpClient.post<User>(url, model).pipe(
      tap(user => {
        if (user){
          localStorage.setItem('access_token', user.token);
          localStorage.setItem('user', JSON.stringify(user));
          this.currentUser.set(user);
        }
      })
    );
  }

  register(model: { email: string; displayName: string; password: string }) {
    const url = `${this.baseUrl}/account/register`;
    return this.httpClient.post<User>(url, model).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.token);
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  setCurrentUser() {
    const userString = localStorage.getItem('user');
    if (!userString) return;
    const user = JSON.parse(userString);
    this.currentUser.set(user);
  }
}
