import { UnitOption } from "./unit";

export type UnitType = 'Weight' | 'Volume' | 'Piece';

export type FoodUnit = {
  id: number;          
  code: string;
  label: string;
  unitType: UnitType;
  conversionFactor: number;
}

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