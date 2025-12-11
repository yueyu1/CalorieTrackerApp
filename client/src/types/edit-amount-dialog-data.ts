import { FoodUnit } from "./unit";

export type EditAmountDialogData = {
  mealId: number;
  foodId: number;
  foodName: string;
  quantity: number;
  unit: string;
  unitLabel: string;
  conversionFactor: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  units: FoodUnit[];
}

export type EditAmountDialogResult = {
  quantity: number;
  unit: string;
}