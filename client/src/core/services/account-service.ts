import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { User } from '../../types/user';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private httpClient = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  login(model: { email: string; password: string }) {
    const url = `${this.baseUrl}/account/login`;
    return this.httpClient.post<User>(url, model).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.token);
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
  }
}
