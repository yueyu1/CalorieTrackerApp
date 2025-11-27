import { Component } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../shared/material';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [
    RouterModule,
    ...MATERIAL_IMPORTS
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {

}
