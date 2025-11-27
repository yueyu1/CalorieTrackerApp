import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MATERIAL_IMPORTS } from '../../shared/material'; 

@Component({
  selector: 'app-not-found',
  imports: [CommonModule, RouterModule, ...MATERIAL_IMPORTS],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {

}
