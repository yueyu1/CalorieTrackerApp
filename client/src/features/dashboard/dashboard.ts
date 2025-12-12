import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  summaryMetrics = [
    { label: 'Calories', unit: 'kcal' },
    { label: 'Protein', unit: 'g' },
    { label: 'Carbs', unit: 'g' },
    { label: 'Fat', unit: 'g' }
  ];

  meals = ['Breakfast', 'Lunch', 'Dinner'];
}
