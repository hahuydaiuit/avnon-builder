import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './context-menu.component.html',
  styles: [],
})
export class ContextMenuComponent {
  @Input() visible = false;
  @Input() x = 0;
  @Input() y = 0;
  @Output() applyToAll = new EventEmitter<void>();

  onApplyToAll(): void {
    this.applyToAll.emit();
  }
}
