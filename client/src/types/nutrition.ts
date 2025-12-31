import { Signal } from "@angular/core";

export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RowNutritionEntry = {
  nutritionSig: Signal<Nutrition>;
  cleanup: () => void;
};