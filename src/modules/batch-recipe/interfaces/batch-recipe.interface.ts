export enum BatchRecipeStatus {
  PLANNED = 0,
  COOKING = 1,
  COMPLETED = 2,
  CANCELLED = 3,
}

export interface BatchRecipeContext {
  id: string;
  recipeId: string;
  storeId: string;
  status: BatchRecipeStatus | null;
}
