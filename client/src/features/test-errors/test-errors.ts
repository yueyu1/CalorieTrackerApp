import { Component, inject } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../shared/material';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-test-errors',
  imports: [...MATERIAL_IMPORTS],
  templateUrl: './test-errors.html',
  styleUrl: './test-errors.css',
})
export class TestErrors {
  private baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  testForbidden() {
    this.http.get(`${this.baseUrl}/buggy/forbidden`).subscribe({
      next: response => console.log(response),
      error: error => console.log(error)
    });
  }

  testUnauthorized() {
    this.http.get(`${this.baseUrl}/buggy/unauthorized`).subscribe({
      next: response => console.log(response),
      error: error => console.log(error)
    });
  }

  testBadRequest() {
    this.http.get(`${this.baseUrl}/buggy/bad-request`).subscribe({
      next: response => console.log(response),
      error: error => console.log(error)
    });
  }

  testServerError() {
    this.http.get(`${this.baseUrl}/buggy/server-error`).subscribe({
      next: response => console.log(response),
      error: error => console.log(error)
    });
  }

  testNotFound() {
    this.http.get(`${this.baseUrl}/buggy/not-found`).subscribe({
      next: response => console.log(response),
      error: error => console.log(error)
    });
  }
}
