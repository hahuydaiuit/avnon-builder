export interface BudgetCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parentId?: string;
  isParent: boolean;
  values: { [month: string]: number };
  isPlaceholder?: boolean;
}

export interface BudgetMonth {
  key: string;
  label: string;
  year: number;
  month: number;
}

export interface BudgetData {
  categories: BudgetCategory[];
  months: BudgetMonth[];
  openingBalance: number;
}

export interface ContextMenuData {
  x: number;
  y: number;
  categoryId: string;
  monthKey: string;
  visible: boolean;
}
