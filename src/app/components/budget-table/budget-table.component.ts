import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContextMenuComponent } from '@components/context-menu';
import { ContextMenuData, BudgetCategory, MonthRange } from '@models/budget.models';
import { BudgetService } from '@services/budget.service';
import { BudgetFilterComponent } from '@components/budget-filter';

@Component({
  selector: 'app-budget-table',
  standalone: true,
  imports: [CommonModule, FormsModule, BudgetFilterComponent, ContextMenuComponent],
  templateUrl: './budget-table.component.html',
  styles: [],
})
export class BudgetTableComponent implements OnInit {
  private budgetService = inject(BudgetService);

  public categories = this.budgetService.categories;
  public months = this.budgetService.months;

  public monthRange: MonthRange = {
    startYear: 2025,
    startMonth: 1,
    endYear: 2025,
    endMonth: 12,
  };

  public contextMenu = signal<ContextMenuData>({
    x: 0,
    y: 0,
    categoryId: '',
    monthKey: '',
    visible: false,
  });

  ngOnInit(): void {
    // Focus the first input cell on load
    this.focusInput('input[autofocus]');

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => {
      this.contextMenu.update((menu) => ({ ...menu, visible: false }));
    });

    // Ensure default month range
    this.budgetService.updateMonthRange(this.monthRange);
  }

  getIncomeCategories(): BudgetCategory[] {
    return this.categories().filter((cat) => cat.type === 'income');
  }

  getExpenseCategories(): BudgetCategory[] {
    return this.categories().filter((cat) => cat.type === 'expense');
  }

  getRowClass(category: BudgetCategory): string {
    if (category.isParent) return 'bg-gray-50';
    if (category.isPlaceholder) return 'bg-gray-100';
    return '';
  }

  getCellCategoryClass(category: BudgetCategory): string {
    if (category.isParent) return 'pl-[1.5rem]';
    if (category.isPlaceholder) return 'pl-[2rem]';
    if (!category.isPlaceholder && !category.isParent) return 'pl-[2rem]';
    return '';
  }

  getCategoryNameClass(category: BudgetCategory): string {
    if (category.isParent) return 'font-semibold';
    if (category.isPlaceholder) return 'text-gray-500 italic';
    return '';
  }

  getInputClass(category: BudgetCategory): string {
    if (category.type === 'income') return 'text-blue-600';
    return 'text-red-600';
  }

  getTotalClass(type: 'income' | 'expense'): string {
    if (type === 'income') return 'text-blue-700';
    return 'text-red-700';
  }

  getProfitLossClass(monthKey: string): string {
    const profitLoss = this.getProfitLoss(monthKey);
    if (profitLoss > 0) return 'text-green-600';
    if (profitLoss < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  getFirstInputCategoryId(): string {
    const firstCategory = this.categories().find((cat) => cat.type === 'income' && !cat.isParent && !cat.isPlaceholder);
    return firstCategory?.id || '';
  }

  /**
   * Handle value changes in the budget table.
   * @param {string} categoryId The ID of the budget category.
   * @param {string} monthKey The key of the budget month.
   * @param {Event} event The input event.
   */
  onValueChange(categoryId: string, monthKey: string, event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.budgetService.updateValue(categoryId, monthKey, value);
  }

  /**
   * Handle keyboard events in the budget table.
   * @param {KeyboardEvent} event The keyboard event.
   * @param {number} monthIndex The index of the budget month.
   * @param {BudgetCategory} category The budget category.
   */
  onKeyDown(event: KeyboardEvent, monthIndex: number, category: BudgetCategory): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      // Create new category row
      this.createNewCategory(category);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      if (monthIndex === this.months().length - 1) {
        // Move to next row if last month
        this.moveToNextRow(category.id);
      } else {
        // Move to next cell if not last month
        this.moveToNextCell(category, monthIndex);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      // Move to next row same month
      this.moveToNextRowSameMonth(category.id, monthIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      // Move to previous row same month
      this.moveToPreviousRowSameMonth(category.id, monthIndex);
    }
  }

  /**
   * Handle blur events in the budget table.
   * @param {Event} event The blur event.
   * @param {string} categoryId The ID of the budget category.
   * @param {string} monthKey The key of the budget month.
   */
  onBlur(event: Event, categoryId: string, monthKey: string): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.budgetService.updateValue(categoryId, monthKey, value);
  }

  /**
   * Handle context menu events in the budget table.
   * @param {MouseEvent} event The context menu event.
   * @param {BudgetCategory} category The budget category.
   * @param {string} monthKey The key of the budget month.
   */
  onContextMenu(event: MouseEvent, category: BudgetCategory, monthKey: string): void {
    if (category.isParent || category.isPlaceholder || (event.target as HTMLInputElement).value === '') return;

    event.preventDefault();
    this.contextMenu.set({
      x: event.clientX,
      y: event.clientY,
      categoryId: category.id,
      monthKey,
      visible: true,
    });
  }

  /**
   * Handle apply to all action in the budget table.
   */
  onApplyToAll(): void {
    const currentContextMenu = this.contextMenu();
    this.budgetService.applyToAll(currentContextMenu.categoryId, currentContextMenu.monthKey);
    this.contextMenu.update((menu) => ({ ...menu, visible: false }));
  }

  /**
   * Track by function for ngFor
   * @param {number} index The index of the item in the list.
   * @param {BudgetCategory} item The budget category item.
   * @returns The unique ID of the budget category.
   */
  trackById(index: number, item: BudgetCategory): string {
    return item.id; // Assuming 'id' is a unique property of your item
  }

  /**
   * Create a new category in the budget table.
   * @param {BudgetCategory} category The budget category.
   */
  public createNewCategory(category: BudgetCategory): void {
    if ((!category.isParent && !category.isPlaceholder) || !category.isPlaceholder) {
      return;
    }

    const currentCategory = this.categories().find((cat) => cat.id === category.id);
    if (currentCategory) {
      // Find the parent category
      let parentId = currentCategory.parentId;
      let name;
      const isParentCategory = !parentId && currentCategory.isParent;
      if (isParentCategory) {
        // If current category is a parent, use it as parent
        parentId = category.id;
        name = prompt('Enter new parent category name:');
      } else {
        name = prompt('Enter new category name:');
      }

      if (name) {
        if (this.isExistName(name, currentCategory)) {
          alert('Category with this name already exists under the selected parent.');
          return;
        }

        if (parentId) {
          this.budgetService.addNewCategory(parentId, name, currentCategory.type, isParentCategory);
        }
      }
    }
  }

  /**
   * Check if a category name already exists under the selected parent.
   * @param name The name of the category.
   * @param currentCategory The current budget category.
   * @returns True if the category exists, false otherwise.
   */
  private isExistName(name: string, currentCategory: BudgetCategory): boolean {
    return this.categories().some(
      (cat) =>
        cat.name === name &&
        cat.parentId === currentCategory.parentId &&
        cat.isParent === currentCategory.isParent &&
        cat.type === currentCategory.type
    );
  }

  /**
   * Move to the next row in the budget table.
   * @param {string} currentCategoryId The ID of the current budget category.
   */
  private moveToNextRow(currentCategoryId: string): void {
    const currentIndex = this.categories().findIndex((cat) => cat.id === currentCategoryId);
    let nextCategory: BudgetCategory | undefined = this.categories()[currentIndex + 1];

    if (nextCategory && (nextCategory.isParent || nextCategory.isPlaceholder)) {
      // Skip to the next non-placeholder category
      nextCategory = this.categories().find(
        (cat, index) => index > currentIndex && !cat.isPlaceholder && !cat.isParent
      );
    }
    if (nextCategory) {
      this.focusInput(`input[data-category="${nextCategory.id}"]`);
    }
  }

  /**
   * Move to the next row in the budget table for the same month.
   * @param {string} currentCategoryId The ID of the current budget category.
   * @param {number} monthIndex The index of the budget month.
   */
  private moveToNextRowSameMonth(currentCategoryId: string, monthIndex: number): void {
    const currentIndex = this.categories().findIndex((cat) => cat.id === currentCategoryId);
    let nextCategory: BudgetCategory | undefined = this.categories()[currentIndex + 1];

    if (nextCategory && (nextCategory.isParent || nextCategory.isPlaceholder)) {
      // Skip to the next non-placeholder category
      nextCategory = this.categories().find(
        (cat, index) => index > currentIndex && !cat.isPlaceholder && !cat.isParent
      );
    }
    if (nextCategory) {
      this.focusInput(`input[data-tabindex="${nextCategory.id + monthIndex}"]`);
    }
  }

  /**
   * Move to the previous row in the budget table for the same month.
   * @param {string} currentCategoryId The ID of the current budget category.
   * @param {number} monthIndex The index of the budget month.
   */
  private moveToPreviousRowSameMonth(currentCategoryId: string, monthIndex: number): void {
    const currentIndex = this.categories().findIndex((cat) => cat.id === currentCategoryId);
    let previousCategory: BudgetCategory | undefined = this.categories()[currentIndex - 1];

    if (previousCategory && (previousCategory.isParent || previousCategory.isPlaceholder)) {
      // Skip to the next non-placeholder category
      previousCategory = this.categories().find(
        (cat, index) => index < currentIndex && !cat.isPlaceholder && !cat.isParent
      );
    }
    if (previousCategory) {
      this.focusInput(`input[data-tabindex="${previousCategory.id + monthIndex}"]`);
    }
  }

  /**
   * Move to the next cell in the budget table.
   * @param {BudgetCategory} category The budget category.
   * @param {number} monthIndex The index of the budget month.
   */
  private moveToNextCell(category: BudgetCategory, monthIndex: number): void {
    const nextMonthIndex = monthIndex + 1;
    this.focusInput(`input[data-tabindex="${category.id + nextMonthIndex}"]`);
  }

  /**
   * Focus the input element matching the given selector.
   * @param selector The CSS selector for the input element.
   */
  private focusInput(selector: string): void {
    setTimeout(() => {
      const input = document.querySelector(selector) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  }

  /**
   * Delete a budget category.
   * @param {string} categoryId The ID of the budget category to delete.
   */
  deleteCategory(categoryId: string): void {
    if (confirm('Are you sure you want to delete this category?')) {
      this.budgetService.deleteCategory(categoryId);
    }
  }

  /**
   * Handle range change events in the budget table.
   */
  onRangeChange(monthRange: MonthRange): void {
    if (
      monthRange.endYear < monthRange.startYear ||
      (monthRange.endYear === monthRange.startYear && monthRange.endMonth < monthRange.startMonth)
    ) {
      this.monthRange.endYear = monthRange.startYear;
      this.monthRange.endMonth = monthRange.startMonth;
    }

    this.budgetService.updateMonthRange(monthRange);
  }

  /**
   * Get the subtotal for a specific category and month.
   * @param {string} categoryId The ID of the budget category.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The subtotal for the category and month.
   */
  getSubTotal(categoryId: string, monthKey: string): number {
    return this.budgetService.getSubTotal(categoryId, monthKey);
  }

  /**
   * Get the total for a specific type and month.
   * @param {('income' | 'expense')} type The type of the budget (income or expense).
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The total for the specified type and month.
   */
  getTotal(type: 'income' | 'expense', monthKey: string): number {
    return this.budgetService.getTotal(type, monthKey);
  }

  /**
   * Get the profit or loss for a specific month.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The profit or loss for the month.
   */
  getProfitLoss(monthKey: string): number {
    return this.budgetService.getProfitLoss(monthKey);
  }

  /**
   * Get the opening balance for a specific month.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The opening balance for the month.
   */
  getOpeningBalance(monthKey: string): number {
    return this.budgetService.getOpeningBalance(monthKey);
  }

  /**
   * Get the closing balance for a specific month.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The closing balance for the month.
   */
  getClosingBalance(monthKey: string): number {
    return this.budgetService.getClosingBalance(monthKey);
  }
}
