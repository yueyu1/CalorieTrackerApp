export type CreateCustomFoodRequest = {
  name: string;
  brand?: string;
  servingDescription: string;
  servingAmount: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type CustomFoodDialogResult = {
  foodId: number;
  unitCode: string;
};