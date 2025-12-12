import { FoodUnit } from "./unit";

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';

export type Meal = {
  id: number;
  mealType: MealType;
  customName?: string;
  mealDate: string;
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export type MealItem = {
  id: number;
  mealId: number;
  foodId: number;
  name: string;
  brand?: string;
  quantity: number;
  unit: string;
  unitLabel: string;
  conversionFactor: number;
  unitType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  units: FoodUnit[];
};
