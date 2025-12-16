export type MacroMode = 'percent' | 'grams';
export type GoalPreset = 'maintain' | 'cut' | 'bulk';
export type WeightUnit = 'g' | 'oz';

export type GoalsSettingsDto = {
  calories: number;
  macroMode: MacroMode;
  protein: number;
  carbs: number;
  fat: number;
  weightUnit: WeightUnit;
  showMacroPercent: boolean;
}