import { Component} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Nav } from "../layout/nav/nav";


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSlideToggleModule, Nav],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App{
}
