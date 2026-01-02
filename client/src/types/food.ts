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
  isArchived: boolean;
  updatedAt?: string;
};

export type FoodQuery = {
  scope?: 'all' | 'global' | 'mine';
  search?: string;
  sort?: string;
  skip?: number;
  take?: number;
  brandsOnly?: boolean;
};

export type UpsertCustomFoodRequest = {
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