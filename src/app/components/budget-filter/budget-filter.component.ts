import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonthRange } from '@models/budget.models';
import { Month } from '@services/mock.data';

@Component({
  selector: 'app-budget-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budget-filter.component.html',
})
export class BudgetFilterComponent {
  @Input() monthRange!: MonthRange;

  @Output() rangeChange = new EventEmitter<MonthRange>();

  public months = Month;

  onRangeChange() {
    // Emit the new range values
    this.rangeChange.emit(this.monthRange);
  }
}
