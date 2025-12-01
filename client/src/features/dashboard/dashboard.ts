import { Component } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../shared/material';

@Component({
  selector: 'app-dashboard',
  imports: [MATERIAL_IMPORTS],
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
