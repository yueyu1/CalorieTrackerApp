import { FoodUnit } from "./unit";

export type Food = {
  id: number;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  baseQuantity: number;
  baseUnit: string;
  units: FoodUnit[];
};