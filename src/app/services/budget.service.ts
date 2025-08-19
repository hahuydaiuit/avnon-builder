import { Injectable, signal, computed } from '@angular/core';
import { BudgetData, BudgetMonth, BudgetCategory, MonthRange } from '@models/budget.models';
import { defaultCategories } from './mock.data';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private budgetData = signal<BudgetData>({
    categories: [],
    months: [],
    openingBalance: 0,
  });

  public categories = computed(() => this.budgetData().categories);
  public months = computed(() => this.budgetData().months);
  public openingBalance = computed(() => this.budgetData().openingBalance);

  constructor() {
    this.initializeDefaultData();
  }

  /**
   * Initialize default data for the budget service.
   */
  private initializeDefaultData(): void {
    const months = this.generateMonths({ startYear: 2025, startMonth: 1, endYear: 2025, endMonth: 12 });
    const categories = this.generateDefaultCategories();

    this.budgetData.set({
      categories,
      months,
      openingBalance: 0,
    });
  }

  /**
   * Generate a list of months between the specified start and end dates.
   * @param monthRange The month range to generate months for.
   * @returns A list of budget months.
   */
  private generateMonths(monthRange: MonthRange): BudgetMonth[] {
    const months: BudgetMonth[] = [];
    let currentYear = monthRange.startYear;
    let currentMonth = monthRange.startMonth;

    while (
      currentYear < monthRange.endYear ||
      (currentYear === monthRange.endYear && currentMonth <= monthRange.endMonth)
    ) {
      const monthKey = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
      const monthLabel = new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      months.push({
        key: monthKey,
        label: monthLabel,
        year: currentYear,
        month: currentMonth,
      });

      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    return months;
  }

  /**
   * Generate default budget categories.
   * @returns {BudgetCategory[]} The list of default budget categories.
   */
  private generateDefaultCategories(): BudgetCategory[] {
    return defaultCategories;
  }

  /**
   * Update the budget value for a specific category and month.
   * @param {string} categoryId The ID of the budget category.
   * @param {string} monthKey The key of the budget month.
   * @param {number} value The new budget value.
   */
  public updateValue(categoryId: string, monthKey: string, value: number): void {
    const currentData = this.budgetData();
    const categoryIndex = currentData.categories.findIndex((cat) => cat.id === categoryId);

    if (categoryIndex !== -1) {
      const updatedCategories = [...currentData.categories];
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        values: {
          ...updatedCategories[categoryIndex].values,
          [monthKey]: value,
        },
      };

      this.budgetData.set({
        ...currentData,
        categories: updatedCategories,
      });
    }
  }

  /**
   * Apply the budget value from a specific category and month to all months.
   * @param {string} categoryId The ID of the budget category.
   * @param {string} monthKey The key of the budget month.
   */
  public applyToAll(categoryId: string, monthKey: string): void {
    const currentData = this.budgetData();
    const category = currentData.categories.find((cat) => cat.id === categoryId);

    if (category && category.values[monthKey] !== undefined) {
      const value = category.values[monthKey];

      currentData.months.forEach((month) => {
        this.updateValue(categoryId, month.key, value);
      });
    }
  }

  /**
   * Add a new category to the budget.
   * @param {string} parentId The ID of the parent category.
   * @param {string} name The name of the new category.
   * @param {('income' | 'expense')} type The type of the new category.
   * @param {boolean} isParent Whether the new category is a parent category.
   */
  public addNewCategory(parentId: string, name: string, type: 'income' | 'expense', isParent: boolean): void {
    let newCategory: BudgetCategory = {
      id: `new-${name.toLocaleLowerCase().replace(/\s+/g, '-')}`,
      name,
      type,
      parentId,
      isParent,
      values: {},
    };
    let newParentCategory: BudgetCategory | undefined;
    if (isParent) {
      newParentCategory = {
        id: `${type}-${name.toLocaleLowerCase().replace(/\s+/g, '-')}`,
        name,
        type,
        isParent,
        values: {},
      };
      newCategory = {
        id: `${type}-${name.toLocaleLowerCase().replace(/\s+/g, '-')}-placeholder`,
        name: `Add new ${name} Category`,
        type,
        parentId: newParentCategory.id,
        isParent: false,
        values: {},
        isPlaceholder: true,
      };
    }

    const currentData = this.budgetData();
    const parentIndex = currentData.categories.findIndex((cat) => cat.id === parentId);

    if (parentIndex !== -1) {
      const updatedCategories = [...currentData.categories];

      // Find the last child of this parent to insert after
      let insertIndex = parentIndex;
      for (let i = parentIndex + 1; i < updatedCategories.length; i++) {
        if (updatedCategories[i].parentId === parentId) {
          insertIndex = i;
        } else if (updatedCategories[i].isParent && updatedCategories[i].type === type) {
          // Stop when we hit the next parent category of the same type
          break;
        }
      }

      if (newParentCategory) {
        updatedCategories.splice(insertIndex, 0, newParentCategory, newCategory);
      } else {
        updatedCategories.splice(insertIndex, 0, newCategory);
      }

      this.budgetData.set({
        ...currentData,
        categories: updatedCategories,
      });
    }
  }

  /**
   * Delete a category from the budget.
   * @param {string} categoryId The ID of the category to delete.
   */
  public deleteCategory(categoryId: string): void {
    const currentData = this.budgetData();
    const updatedCategories = currentData.categories.filter((cat) => cat.id !== categoryId);

    this.budgetData.set({
      ...currentData,
      categories: updatedCategories,
    });
  }

  /**
   * Get the subtotal for a specific category and month.
   * @param {string} categoryId The ID of the budget category.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The subtotal for the category and month.
   */
  public getSubTotal(categoryId: string, monthKey: string): number {
    const currentData = this.budgetData();
    const parentCategory = currentData.categories.find((cat) => cat.id === categoryId);

    if (parentCategory && parentCategory.isParent) {
      return currentData.categories
        .filter((cat) => cat.parentId === categoryId && !cat.isPlaceholder)
        .reduce((sum, cat) => sum + (cat.values[monthKey] || 0), 0);
    }

    return 0;
  }

  /**
   * Get the total for a specific category and month.
   * @param {string} categoryId The ID of the budget category.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The total for the category and month.
   */
  public getTotal(type: 'income' | 'expense', monthKey: string): number {
    const currentData = this.budgetData();
    const filteredCategories = currentData.categories.filter(
      (cat) => cat.type === type && !cat.isParent && !cat.isPlaceholder
    );

    return filteredCategories.reduce((sum, cat) => sum + (cat.values[monthKey] || 0), 0);
  }

  /**
   * Get the profit or loss for a specific month.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The profit or loss for the month.
   */
  public getProfitLoss(monthKey: string): number {
    const income = this.getTotal('income', monthKey);
    const expenses = this.getTotal('expense', monthKey);
    return income - expenses;
  }

  /**
   * Get the opening balance for a specific month.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The opening balance for the month.
   */
  public getOpeningBalance(monthKey: string): number {
    const currentData = this.budgetData();
    const monthIndex = currentData.months.findIndex((month) => month.key === monthKey);

    if (monthIndex === 0) {
      return currentData.openingBalance;
    }

    const previousMonth = currentData.months[monthIndex - 1];
    return this.getClosingBalance(previousMonth.key);
  }

  /**
   * Get the closing balance for a specific month.
   * @param {string} monthKey The key of the budget month.
   * @returns {number} The closing balance for the month.
   */
  public getClosingBalance(monthKey: string): number {
    const openingBalance = this.getOpeningBalance(monthKey);
    const profitLoss = this.getProfitLoss(monthKey);
    return openingBalance + profitLoss;
  }

  /**
   * Update the month range for the budget.
   * @param {MonthRange} monthRange The new month range.
   */
  public updateMonthRange(monthRange: MonthRange): void {
    const months = this.generateMonths(monthRange);
    const currentData = this.budgetData();

    this.budgetData.set({
      ...currentData,
      months,
    });
  }
}
