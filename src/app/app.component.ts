import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetTableComponent } from './components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BudgetTableComponent],
  templateUrl: './app.component.html',
  styles: [],
})
export class AppComponent {
  title = 'avnon-builder';
}
