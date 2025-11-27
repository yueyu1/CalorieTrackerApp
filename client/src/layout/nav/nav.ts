import { Component } from '@angular/core';
import { MATERIAL_IMPORTS } from '../../shared/material';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [
    RouterModule,
    ...MATERIAL_IMPORTS
  ],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {

}
