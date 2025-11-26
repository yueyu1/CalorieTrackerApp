import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSlideToggleModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit{
  protected readonly title = signal('client');
  private httpClient = inject(HttpClient);
  protected members = signal<any>([]);
 
  ngOnInit(): void {
    this.httpClient.get('https://localhost:5001/api/members').subscribe({
      next: (response: any) => this.members.set(response),
      error: (err: any) => console.error('Error fetching members', err),
      complete: () => console.log('Finished fetching members')
    })
  }
}
